#include "config.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h> // 1.3" OLED uses SH1106 chip, NOT SSD1306
#include <Arduino.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <Wire.h>

#define OLED_RESET_PIN 4

Adafruit_SH1106G display(128, 64, &Wire, OLED_RESET_PIN);

Preferences prefs;
String wifiSSID, wifiPass, serverIP;
int serverPort = DEFAULT_SERVER_PORT;

String currentState = "UNKNOWN";
String lastResponse = "";
unsigned long lastReed = 0;
unsigned long lastBtn = 0;
bool wifiOk = false;

// Mutex ensures only one core touches the display at a time.
// Without this, Core 0 (poll task) and Core 1 (loop) can write to the SH1106
// simultaneously over I2C, causing display corruption and garbled output.
SemaphoreHandle_t displayMutex = NULL;

// responseStartTime is only written/read inside the poll task (Core 0).
// Removed from loop() entirely so Core 1 never races against Core 0.
static unsigned long responseStartTime = 0;

// Edge-detect for emergency button: fire once per press, not while held.
static bool lastBtnState = HIGH;

void oledInit() {
  if (!display.begin(0x3C, true)) {
    if (!display.begin(0x3D, true)) {
      Serial.println("[OLED] NOT FOUND at 0x3C or 0x3D — check wiring");
      return;
    }
    Serial.println("[OLED] Found at 0x3D");
  } else {
    Serial.println("[OLED] SH1106 found at 0x3C");
  }

  display.clearDisplay();
  display.display();
  delay(50);

  Serial.println("[OLED] Initialized and cleared");
}

// Every display write is wrapped with mutex take/give so Core 0 and Core 1
// never collide on the I2C bus.
void showMsg(const char *line1, const char *line2 = "") {
  if (displayMutex)
    xSemaphoreTake(displayMutex, portMAX_DELAY);

  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);

  bool hasLine2 = (line2 != nullptr && strlen(line2) > 0);

  display.setTextSize(2);
  int16_t x1, y1;
  uint16_t w1, h1;
  display.getTextBounds(line1, 0, 0, &x1, &y1, &w1, &h1);

  int xPos1 = max(0, (int)((128 - w1) / 2));
  int yPos1 = hasLine2 ? 10 : 24;

  display.setCursor(xPos1, yPos1);
  display.print(line1);

  if (hasLine2) {
    display.setTextSize(1);
    int16_t x2, y2;
    uint16_t w2, h2;
    display.getTextBounds(line2, 0, 0, &x2, &y2, &w2, &h2);

    int xPos2 = max(0, (int)((128 - w2) / 2));
    display.setCursor(xPos2, 40);
    display.print(line2);
  }

  display.display();

  if (displayMutex)
    xSemaphoreGive(displayMutex);
}

// Draws a ⚠️ warning icon using GFX primitives on the 128×64 OLED.
// Triangle apex at top-center, exclamation mark inside.
// Layout: icon left-half (60px wide), "INTERRUPTED" text right-half,
// so both fit on screen simultaneously.
void showWarning(const char *label = "INTERRUPTED") {
  if (displayMutex)
    xSemaphoreTake(displayMutex, portMAX_DELAY);

  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);

  // ── Warning triangle (left side, vertically centered) ──────
  // Outer filled triangle: tip=(30,4), left=(2,58), right=(58,58)
  display.fillTriangle(30, 4, 2, 58, 58, 58, SH110X_WHITE);
  // Inner black triangle (hollow effect): tip=(30,12), left=(9,53),
  // right=(51,53)
  display.fillTriangle(30, 12, 9, 53, 51, 53, SH110X_BLACK);

  // ── Exclamation mark inside the triangle ───────────────────
  // Stem: 3px wide, from y=20 to y=44
  display.fillRect(28, 20, 4, 22, SH110X_WHITE);
  // Dot: 4×4 pixels at y=48
  display.fillRect(28, 46, 4, 4, SH110X_WHITE);

  // ── Label text (right half of screen) ──────────────────────
  display.setTextSize(1);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(label, 0, 0, &x1, &y1, &w, &h);
  // Right zone: x=65..127 (62px wide), center within it
  int xPos = 65 + max(0, (int)((62 - w) / 2));
  display.setCursor(xPos, 28);
  display.print(label);

  display.display();
  if (displayMutex)
    xSemaphoreGive(displayMutex);
}

// EMERGENCY_PENDING always shows ATTENTION NEEDED regardless of whatever
// last_response the server sends. This is a defensive two-layer fix:
//   Layer 1 (server/services/controller.py): clears last_response on new
//   emergency. Layer 2 (here): ESP32 ignores any stale last_response during
//   EMERGENCY_PENDING.
void showState(const String &state, const String &response = "") {

  // Emergency always wins — never show a stale response over it
  if (state == "EMERGENCY_PENDING") {
    showMsg("REQUEST", "SENT");
    return;
  }

  // For all other states, show response only when one is actively set
  if (response.length() > 0 && response != "null") {
    if (response == "WAIT") {
      showMsg("PLEASE", "WAIT");
    } else if (response == "DO_NOT_DISTURB") {
      showMsg("DO NOT", "DISTURB");
    } else if (response == "COMING") {
      showMsg("COMING", "2 MINUTES");
    } else {
      showMsg(response.c_str());
    }
    return;
  }

  if (state == "IDLE")
    showMsg("ROOM", "AVAILABLE");
  else if (state == "ACTIVE_MEETING")
    showMsg("MEETING", "IN PROGRESS");
  else if (state == "INTERRUPTED")
    showWarning("INTERRUPTED"); // ⚠️ icon + label
  else if (state == "DISCONNECTED")
    showMsg("SERVER", "OFFLINE");
  else
    showMsg(state.c_str());
}

bool loadConfig() {
  prefs.begin("ddc", true);
  wifiSSID = prefs.getString("ssid", "");
  wifiPass = prefs.getString("pass", "");
  serverIP = prefs.getString("server_ip", "");
  serverPort = prefs.getInt("server_port", DEFAULT_SERVER_PORT);
  prefs.end();

  bool ok = wifiSSID.length() > 0 && serverIP.length() > 0;
  if (ok) {
    Serial.printf("[NVS] SSID: %s | Server: %s:%d\n", wifiSSID.c_str(),
                  serverIP.c_str(), serverPort);
  }
  return ok;
}

void saveConfig(const String &ssid, const String &pass, const String &ip,
                int port) {
  prefs.begin("ddc", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.putString("server_ip", ip);
  prefs.putInt("server_port", port);
  prefs.end();
  Serial.println("[NVS] Config saved");
  Serial.println("CONFIG_SAVED");
}

void handleProvisioning(unsigned long timeoutMs) {
  showMsg("SETUP", "READY");
  Serial.println("[Provision] Waiting for credentials...");

  String newSSID, newPass, newIP;
  int newPort = DEFAULT_SERVER_PORT;
  unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    if (!Serial.available()) {
      delay(50);
      continue;
    }

    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0)
      continue;

    Serial.print("[Provision] RX: ");
    Serial.println(line);

    if (line.startsWith("SSID:"))
      newSSID = line.substring(5);
    else if (line.startsWith("PASS:"))
      newPass = line.substring(5);
    else if (line.startsWith("SERVER_IP:"))
      newIP = line.substring(10);
    else if (line.startsWith("SERVER_PORT:"))
      newPort = line.substring(12).toInt();
    else if (line == "SAVE") {
      if (newSSID.length() > 0 && newIP.length() > 0) {
        saveConfig(newSSID, newPass, newIP, newPort);
        showMsg("SAVED!", "Restarting");
        delay(1500);
        ESP.restart();
        return;
      }
      Serial.println("[Provision] ERROR: SSID or SERVER_IP missing");
    }
  }
  Serial.println("[Provision] Timeout");
}

bool connectWiFi() {
  Serial.printf("[WiFi] Connecting to: %s\n", wifiSSID.c_str());
  showMsg("WIFI", "CONNECTING");

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSSID.c_str(), wifiPass.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiOk = true;
    Serial.printf("[WiFi] Connected: %s\n", WiFi.localIP().toString().c_str());
    showMsg("WIFI OK");
    delay(800);
    return true;
  }

  wifiOk = false;
  Serial.println("[WiFi] FAILED");
  showMsg("WIFI", "FAILED");
  delay(2000);
  return false;
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED)
    return;
  wifiOk = false;
  showMsg("NO", "CONNECTION");
  Serial.println("[WiFi] Lost — retrying...");
  delay(3000);
  connectWiFi();
}

String buildURL(const char *path) {
  return "http://" + serverIP + ":" + String(serverPort) + path;
}

// Fetch current state immediately and show it on the OLED.
// Called once after WiFi connects so the display never sits on
// "WIFI OK" waiting for the poll task's first cycle.
void fetchInitialState() {
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  http.begin(buildURL("/api/room/status")); // no ?wait=1 — instant response
  http.setTimeout(5000);
  http.addHeader("Accept", "application/json");

  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    Serial.printf("[Init] %s\n", body.c_str());

    String newState = "";
    String newResponse = "";

    int si = body.indexOf("\"state\":\"");
    if (si >= 0) {
      si += 9;
      int ei = body.indexOf("\"", si);
      if (ei > si)
        newState = body.substring(si, ei);
    }

    int ri = body.indexOf("\"last_response\":\"");
    if (ri >= 0) {
      ri += 17;
      int re = body.indexOf("\"", ri);
      if (re > ri)
        newResponse = body.substring(ri, re);
    }

    // Defensive: always clear response when in EMERGENCY_PENDING
    if (newState == "EMERGENCY_PENDING")
      newResponse = "";

    currentState = newState;
    lastResponse = newResponse;
    showState(currentState, lastResponse);
    Serial.printf("[Init] Initial state: %s\n", currentState.c_str());
  } else {
    Serial.printf("[Init] Failed HTTP %d — showing IDLE fallback\n", code);
    showMsg("ROOM", "AVAILABLE"); // safe fallback if server unreachable
  }

  http.end();
}

bool httpPost(const char *path, const char *jsonBody) {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  HTTPClient http;
  http.begin(buildURL(path));
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(jsonBody);
  bool ok = (code == 200);
  Serial.printf("[POST] %s → HTTP %d\n", path, code);
  http.end();
  return ok;
}

void httpPollTask(void *param) {
  // No startup delay — fetchInitialState() already showed the correct
  // state before this task was created.

  for (;;) {
    ensureWiFi();

    if (WiFi.status() != WL_CONNECTED) {
      vTaskDelay(pdMS_TO_TICKS(3000));
      continue;
    }

    HTTPClient http;
    http.begin(buildURL("/api/room/status?wait=1"));
    http.setTimeout(35000); // server holds up to 30 s; give 5 s margin
    http.addHeader("Accept", "application/json");

    int code = http.GET();

    if (code == 200) {
      String body = http.getString();
      Serial.printf("[Poll] Response: %s\n", body.c_str());

      String newState = "";
      String newResponse = "";

      int si = body.indexOf("\"state\":\"");
      if (si >= 0) {
        si += 9;
        int ei = body.indexOf("\"", si);
        if (ei > si)
          newState = body.substring(si, ei);
      }

      int ri = body.indexOf("\"last_response\":\"");
      if (ri >= 0) {
        ri += 17;
        int re = body.indexOf("\"", ri);
        if (re > ri)
          newResponse = body.substring(ri, re);
      }

      // Defensive: force-clear response when EMERGENCY_PENDING regardless
      // of what the server echoes (two-layer fix, see controller.py).
      if (newState == "EMERGENCY_PENDING") {
        newResponse = "";
        responseStartTime = 0; // no response timer during emergency
      }

      // Check if the response display timer has expired (5 seconds).
      // Force-call showState() so the OLED updates immediately — without
      // this the condition below won't trigger because newState/newResponse
      // match lastState/lastResponse (both already empty).
      if (responseStartTime > 0 && (millis() - responseStartTime > 5000)) {
        responseStartTime = 0;
        lastResponse = ""; // expire the shown response
        newResponse = "";
        showState(currentState, ""); // force OLED back to room state
        Serial.println("[Poll] Response display expired — reverting to state");
      }

      if (newState != currentState || newResponse != lastResponse) {
        currentState = newState;
        lastResponse = newResponse;

        // Start timer only when a real response is being displayed
        if (lastResponse.length() > 0 && currentState != "EMERGENCY_PENDING") {
          responseStartTime = millis();
        } else {
          responseStartTime = 0;
        }

        showState(currentState, lastResponse);
        Serial.printf("[Poll] State: %s | Response: %s\n", currentState.c_str(),
                      lastResponse.c_str());
        Serial.println("[OLED] Display updated");
      } else {
        Serial.println("[Poll] No state change");
      }

    } else if (code < 0) {
      Serial.printf("[Poll] Connection failed: %s\n",
                    HTTPClient::errorToString(code).c_str());
      if (currentState != "OFFLINE") {
        currentState = "OFFLINE";
        showMsg("SERVER", "OFFLINE");
      }
    } else {
      Serial.printf("[Poll] HTTP %d\n", code);
    }

    http.end();
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n===========================");
  Serial.println("  Deep Work Concierge v1.0");
  Serial.println("===========================");

  // Create mutex before any display use or task creation.
  displayMutex = xSemaphoreCreateMutex();
  if (!displayMutex) {
    Serial.println("[FATAL] Could not create display mutex");
  }

  Wire.begin(OLED_SDA, OLED_SCL);
  oledInit();
  showMsg("DDC", "STARTING");

  // Reset all volatile state on every boot — clean slate even if the server
  // still has old data in memory from before the reboot.
  currentState = "UNKNOWN";
  lastResponse = "";
  responseStartTime = 0;
  lastBtnState = HIGH;

  // ── GPIO ──────────────────────────────────────────────────
  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(BTN_PIN, INPUT_PULLUP);

  Serial.printf("[GPIO] Reed=%d, Button=%d\n", REED_PIN, BTN_PIN);
  Serial.println("[GPIO] Using GPIO32/33 with internal pull-ups");

  bool hasConfig = loadConfig();

  if (!hasConfig) {
    Serial.println("[Boot] No config found — entering provisioning");
    handleProvisioning(30000);
    hasConfig = loadConfig();
  } else {
    handleProvisioning(6000);
    loadConfig();
  }

  if (wifiSSID.length() == 0 || serverIP.length() == 0) {
    Serial.println("[Boot] FATAL: No valid config");
    showMsg("NO", "CONFIG");
    for (;;) {
      display.invertDisplay(true);
      delay(500);
      display.invertDisplay(false);
      delay(500);
    }
  }

  connectWiFi();

  // Show actual room state immediately — don't leave "WIFI OK" on screen
  // while waiting for the poll task's first cycle.
  fetchInitialState();

  BaseType_t taskResult = xTaskCreatePinnedToCore(httpPollTask, "HTTPPollTask",
                                                  8192, NULL, 1, NULL, 0);

  if (taskResult == pdPASS) {
    Serial.println("[Boot] HTTP poll task started on Core 0");
  } else {
    Serial.println("[Boot] ERROR: Failed to create HTTP poll task");
  }

  Serial.println("[Boot] Setup complete");
  Serial.printf("[Boot] Server: http://%s:%d\n", serverIP.c_str(), serverPort);
}

// loop() only handles physical inputs. All display updates happen exclusively
// in httpPollTask() (Core 0), protected by the mutex.
void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED && wifiOk) {
    wifiOk = false;
    Serial.println("[Loop] WiFi lost");
  }

  // ── Reed switch ───────────────────────────────────────────
  // Reads LOW when door opens (internal pull-up = normally HIGH)
  if (digitalRead(REED_PIN) == LOW) {
    if (now - lastReed > DEBOUNCE_MS) {
      delay(5);
      if (digitalRead(REED_PIN) == LOW) {
        lastReed = now;
        Serial.println("[Input] Reed switch triggered");
        httpPost("/api/door/event", "{\"event\":\"DOOR_INTERACTION\"}");
      }
    }
  }

  // ── Emergency button — EDGE TRIGGERED ───────────────────
  // Only fires on the falling edge (HIGH→LOW transition), not while held.
  // This prevents sending repeated emergency requests while the button
  // is pressed and held, which would spam the server.
  bool btnState = digitalRead(BTN_PIN);
  if (btnState == LOW && lastBtnState == HIGH) {
    // Debounce: confirm the press is real after a short settle time
    delay(DEBOUNCE_MS);
    if (digitalRead(BTN_PIN) == LOW) {
      Serial.println("[Input] Emergency button pressed");
      httpPost("/api/door/emergency", "{\"event\":\"REQUEST\"}");
      // Clear local response state immediately so there is no window where
      // the old response flashes before the poll task gets EMERGENCY_PENDING.
      lastResponse = "";
      responseStartTime = 0;
    }
  }
  lastBtnState = btnState;

  delay(50);
}