#pragma once
// These are defaults only — overwritten by NVS values after provisioning.
// Do NOT hardcode credentials here in production.
#define DEFAULT_SSID ""
#define DEFAULT_PASS ""
#define DEFAULT_SERVER_IP ""
#define DEFAULT_SERVER_PORT 8080

// Hardware pins
#define DOOR_PIN 32 // Touch sensor OUT pin — outputs HIGH when touched
#define BTN_PIN 33  // Emergency button — INPUT_PULLUP, active LOW
#define OLED_SDA 21
#define OLED_SCL 22
#define DEBOUNCE_MS 250
