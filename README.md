# Deep Work Concierge

A production-ready local web application for Windows that manages meeting interruptions and emergency requests through an ESP32 device.

## Architecture

- **Flask REST API** (port 8080) - Main server with WebSocket support
- **React SPA** - Setup wizard and live dashboard  
- **ESP32** - Hardware interface with OLED display, reed switch, and emergency button
- **No MQTT** - Uses HTTP long-polling for real-time updates

## Quick Start

### 1. Build Frontend
```bash
cd build
build_client.bat
```

### 2. Setup Python Environment
```bash
cd server
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ../requirements.txt
```

### 3. Run Development Server
```bash
cd server
python run.py
```
The app will open at http://localhost:8080

### 4. Build Production EXE
```bash
cd build
build_exe.bat
```

### 5. Create Installer
Open `setup.iss` in Inno Setup and compile to create `DDC_Installer.exe`

## Hardware Setup

### ESP32 Connections
Component     → ESP32 Pin
─────────────────────────────
Reed Switch   → GPIO32 (INPUT_PULLUP, to GND)
Emergency Btn → GPIO33 (INPUT_PULLUP, to GND)
OLED SDA      → GPIO21
OLED SCL      → GPIO22
OLED VCC      → 3.3V
OLED GND      → GND

### Provisioning Flow
1. Connect ESP32 via USB
2. Run setup wizard in browser
3. Select COM port and enter WiFi credentials
4. Firmware receives server IP and connects automatically

## API Endpoints

- `GET /api/status` - Current FSM state
- `GET /api/room/status?wait=1` - Long-poll for state changes
- `POST /api/door/event` - Reed switch trigger
- `POST /api/door/emergency` - Emergency button press
- `POST /api/respond` - User response (WAIT/DO_NOT_DISTURB)
- `GET /api/wifi` - PC WiFi and LAN IP info
- `GET /api/ports` - Available COM ports
- `POST /api/provision` - Flash ESP32 credentials

## State Machine

```
IDLE → ACTIVE_MEETING (Teams detected)
ACTIVE_MEETING → INTERRUPTED (door interaction)
INTERRUPTED → ACTIVE_MEETING (timeout expires)
ACTIVE_MEETING → EMERGENCY_PENDING (emergency button)
EMERGENCY_PENDING → ACTIVE_MEETING (user responds)
```

## Features

- **Automatic Teams detection** via process monitoring
- **Microphone muting** on door interruptions
- **Real-time OLED updates** via HTTP long-polling
- **Emergency response system** with WAIT/DO_NOT_DISTURB
- **Zero-configuration setup** wizard
- **Production installer** with auto-start

## Dependencies

- Python 3.12+
- Node.js 18+
- PlatformIO (for ESP32 development)
- Inno Setup (for Windows installer)

## License

MIT License
