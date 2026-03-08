import serial, serial.tools.list_ports, time, logging

CHIP_KEYWORDS = ["CP210", "CH340", "CH341", "FTDI", "USB Serial", "ESP32"]

def find_esp32_port() -> str | None:
    for p in serial.tools.list_ports.comports():
        if any(k in (p.description or "") for k in CHIP_KEYWORDS):
            return p.device
    return None

def list_ports() -> list[dict]:
    return [{"device": p.device, "description": p.description}
            for p in serial.tools.list_ports.comports()]

def send_credentials(port: str, ssid: str, password: str,
                     server_ip: str, server_port: int = 8080) -> dict:
    """
    Sends over serial:
      SSID:<ssid>
      PASS:<password>
      SERVER_IP:<ip>
      SERVER_PORT:<port>
      SAVE

    Returns {"success": bool, "message": str}
    """
    try:
        ser = serial.Serial(port, 115200, timeout=3)
        time.sleep(2)  # wait for ESP32 boot/reset

        lines = [
            f"SSID:{ssid}",
            f"PASS:{password}",
            f"SERVER_IP:{server_ip}",
            f"SERVER_PORT:{server_port}",
            "SAVE"
        ]
        for line in lines:
            ser.write((line + "\n").encode())
            time.sleep(0.4)

        ser.close()
        logging.info(f"[Provisioner] Credentials sent to {port}")
        return {"success": True, "message": "ESP32 configured successfully."}

    except serial.SerialException as e:
        return {"success": False, "message": f"Serial error: {e}"}
    except Exception as e:
        return {"success": False, "message": f"Error: {e}"}
