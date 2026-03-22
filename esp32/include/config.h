#pragma once
// These are defaults only — overwritten by NVS values after provisioning.
// Do NOT hardcode credentials here in production.
#define DEFAULT_SSID ""
#define DEFAULT_PASS ""
#define DEFAULT_SERVER_IP ""
#define DEFAULT_SERVER_PORT 8080

// Hardware pins - using GPIOs with internal pull-ups
#define REED_PIN 32 // Built-in pull-up available (was 34)
#define BTN_PIN 33  // Built-in pull-up available (was 35)
#define OLED_SDA 21
#define OLED_SCL 22
#define DEBOUNCE_MS 250
