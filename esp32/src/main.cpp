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
unsigned long responseStartTime = 0; // Track when response was shown

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

void showMsg(const char *line1, const char *line2 = "") {
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
}

void showState(const String &state, const String &response = "") {
  if (response.length() > 0 && response != "null") {
    if (response == "WAIT") {
      showMsg("PLEASE", "WAIT");
      responseStartTime = millis(); // Start timer
    } else if (response == "DO_NOT_DISTURB") {
      showMsg("DO NOT", "DISTURB");
      responseStartTime = millis(); // Start timer
    } else if (response == "COMING") {
      showMsg("COMING", "2 MINUTES");
      responseStartTime = millis(); // Start timer
    } else {
      showMsg(response.c_str());
      responseStartTime = millis(); // Start timer
    }
    return;
  }

  if (state == "IDLE")
    showMsg("ROOM", "AVAILABLE");
  else if (state == "ACTIVE_MEETING")
    showMsg("MEETING", "IN PROGRESS");
  else if (state == "INTERRUPTED")
    showMsg("MEETING", "INTERRUPTED");
  else if (state == "EMERGENCY_PENDING")
    showMsg("ATTENTION", "NEEDED");
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
  vTaskDelay(pdMS_TO_TICKS(2000));

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

      if (newState != currentState || newResponse != lastResponse) {
        currentState = newState;
        lastResponse = newResponse;
        showState(currentState, lastResponse);
        Serial.printf("[Poll] State: %s | Response: %s\n", currentState.c_str(),
                      lastResponse.c_str());
        Serial.println("[OLED] Display updated with new state/response");
      } else {
        Serial.printf("[Poll] Current: %s/%s, New: %s/%s\n",
                      currentState.c_str(), lastResponse.c_str(),
                      newState.c_str(), newResponse.c_str());
        Serial.println("[Poll] No state change detected - forcing update");
        // Force update for emergency responses
        if (newResponse != "" && newResponse != lastResponse) {
          lastResponse = newResponse;
          showState(currentState, lastResponse);
          Serial.println("[OLED] Forced update for emergency response");
        }
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

  Wire.begin(OLED_SDA, OLED_SCL);
  oledInit();
  showMsg("DDC", "STARTING");

  // Reset state on startup to clear any stale states
  currentState = "IDLE";
  lastResponse = "";
  responseStartTime = 0;

  // ── GPIO ──────────────────────────────────────────────────
  // Using GPIO32/33 which have proper internal pull-ups
  // GPIO34/35 are INPUT-ONLY and cannot use INPUT_PULLUP
  pinMode(REED_PIN, INPUT_PULLUP); // Built-in pull-up now works
  pinMode(BTN_PIN, INPUT_PULLUP);  // Built-in pull-up now works

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

void loop() {
  unsigned long now = millis();

  // Check if response display timer expired (10 seconds)
  if (responseStartTime > 0 && (now - responseStartTime > 10000)) {
    responseStartTime = 0;   // Reset timer
    showState(currentState); // Return to current state display
    Serial.println(
        "[OLED] Response display expired - returning to current state");
  }

  if (WiFi.status() != WL_CONNECTED && wifiOk) {
    wifiOk = false;
    Serial.println("[Loop] WiFi lost");
  }

  // ── Reed switch ───────────────────────────────────────────
  // Reads LOW when door opens (internal pull-up = normally HIGH)
  if (digitalRead(REED_PIN) == LOW) {
    if (now - lastReed > DEBOUNCE_MS) {
      // Double-check to prevent bounce
      delay(5);
      if (digitalRead(REED_PIN) == LOW) {
        lastReed = now;
        Serial.println("[Input] Reed switch triggered");
        httpPost("/api/door/event", "{\"event\":\"DOOR_INTERACTION\"}");
      }
    }
  }

  // ── Emergency button ──────────────────────────────────────
  // Reads LOW when pressed (internal pull-up = normally HIGH)
  if (digitalRead(BTN_PIN) == LOW) {
    if (now - lastBtn > DEBOUNCE_MS) {
      // Double-check to prevent bounce
      delay(5);
      if (digitalRead(BTN_PIN) == LOW) {
        lastBtn = now;
        Serial.println("[Input] Emergency button pressed");
        httpPost("/api/door/emergency", "{\"event\":\"REQUEST\"}");
      }
    }
  }

  delay(50);
}