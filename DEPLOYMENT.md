# Deep Work Concierge - Deployment Guide

## Quick Deploy Commands

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Deep Work Concierge v1.0"
```

### 2. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `deep-work-concierge`
3. Choose Public/Private
4. Click "Create repository"
5. Copy the repository URL

### 3. Push to GitHub
```bash
git remote add origin https://github.com/yourusername/deep-work-concierge.git
git branch -M main
git push -u origin main
```

## Production Deployment

### Option 1: Windows Installer (Recommended)
```bash
# Build installer
cd build
setup.iss  # Open in Inno Setup and compile

# Distribute: build/Output/DDC_Installer.exe
```

### Option 2: Portable Version
```bash
# Build frontend
cd build
build_client.bat

# Build Python EXE
cd ..\server
pyinstaller --noconfirm --onedir --windowed ^
  --name "DDC" ^
  --add-data "static;static" ^
  --hidden-import=engineio.async_drivers.threading ^
  --hidden-import=flask_socketio ^
  --hidden-import=pycaw ^
  --hidden-import=comtypes ^
  run.py

# Distribute: server/dist/DDC/ folder
```

### Option 3: Docker Deployment
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY server/ ./server/
COPY client/build/ ./server/static/
EXPOSE 8080
CMD ["python", "server/run.py"]
```

## Hardware Requirements

### ESP32 Components
- ESP32 Dev Board
- SSD1306 OLED Display (128x64)
- Reed Switch (normally open)
- Push Button (momentary)
- Jumper wires
- USB cable for programming

### Wiring Summary
```
Component    → ESP32 Pin
─────────────────────────────
Reed Switch → GPIO12 (to GND)
Emergency Btn → GPIO13 (to GND)
OLED SDA     → GPIO21
OLED SCL     → GPIO22
OLED VCC     → 3.3V
OLED GND     → GND
```

## User Setup Instructions

1. **Install Application**
   - Run `DDC_Installer.exe`
   - Follow Windows installer prompts

2. **Hardware Setup**
   - Connect ESP32 as shown above
   - Power via USB or external 5V

3. **Initial Configuration**
   - Open http://localhost:8080
   - Complete setup wizard
   - Configure WiFi and server connection

4. **Daily Use**
   - Application starts automatically with Windows
   - Access dashboard at http://localhost:8080
   - ESP32 connects automatically to WiFi

## Support & Troubleshooting

### Common Issues
- **COM port errors**: Close Arduino/PlatformIO, run as admin
- **WiFi connection**: Check SSID/password in setup
- **Continuous triggers**: Verify reed switch wiring
- **404 errors**: Ensure frontend is built

### Logs Location
- Windows: `%APPDATA%/DeepWorkConcierge/logs/app.log`
- Linux: `~/.local/share/DeepWorkConcierge/logs/app.log`

### API Endpoints Reference
- `GET /api/status` - Current system state
- `POST /api/door/event` - Reed switch trigger
- `POST /api/door/emergency` - Emergency button
- `POST /api/respond` - User response
- `GET /api/wifi` - Network info
- `GET /api/ports` - COM ports
- `POST /api/provision` - ESP32 configuration
