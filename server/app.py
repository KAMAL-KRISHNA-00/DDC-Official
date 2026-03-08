import sys, os, logging
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS

from services.controller      import DDCController
from services.long_poll       import wait_for_change
from services.wifi_detector   import get_wifi_info
from services.esp32_provisioner import find_esp32_port, list_ports, send_credentials
from services import config_store
from core.notifier import Notifier

# ── App Setup ────────────────────────────────────────────────
STATIC_DIR = Path(__file__).parent / "static"

app      = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

controller = DDCController(socketio=socketio)


# ── Serve React SPA ──────────────────────────────────────────
@app.route("/setup")
def serve_setup():
    return send_from_directory(str(STATIC_DIR), "setup.html")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    target = STATIC_DIR / path
    if path and target.exists():
        return send_from_directory(str(STATIC_DIR), path)
    return send_from_directory(str(STATIC_DIR), "index.html")

# ─────────────────────────────────────────────────────────────
# STATUS ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.route("/api/status")
def api_status():
    """Instant status — used by browser on page load."""
    return jsonify(controller.get_status())


@app.route("/api/room/status")
def api_room_status():
    """
    Long-poll endpoint — used exclusively by ESP32.

    If ?wait=1 is passed:
      - Holds the HTTP connection open (up to 30 seconds)
      - Returns immediately when state changes
      - ESP32 reconnects right after receiving the response

    If ?wait=0 or omitted:
      - Returns current state instantly (used for initial ESP32 sync)
    """
    should_wait = request.args.get("wait", "0") == "1"

    if should_wait:
        # Block until state changes or 30s timeout
        changed = wait_for_change(timeout=30.0)
        # Return current state regardless (timeout is normal, ESP32 just reconnects)

    status = controller.get_status()
    return jsonify({
        "state":         status["state"],
        "last_response": status["last_response"],
    })

# ─────────────────────────────────────────────────────────────
# ESP32 INPUT ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.route("/api/door/event", methods=["POST"])
def api_door_event():
    """
    Called by ESP32 when reed switch triggers.
    Body: {"event": "DOOR_INTERACTION"}
    """
    data = request.get_json(silent=True) or {}
    if data.get("event") == "DOOR_INTERACTION":
        triggered = controller.door_interrupt()
        return jsonify({"success": triggered})
    return jsonify({"success": False, "message": "Unknown event"}), 400


@app.route("/api/door/emergency", methods=["POST"])
def api_door_emergency():
    """
    Called by ESP32 when emergency button pressed.
    Body: {"event": "REQUEST"}
    """
    data = request.get_json(silent=True) or {}
    if data.get("event") == "REQUEST":
        triggered = controller.emergency_request()
        return jsonify({"success": triggered})
    return jsonify({"success": False, "message": "Unknown event"}), 400

# ─────────────────────────────────────────────────────────────
# BROWSER ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.route("/api/respond", methods=["POST"])
def api_respond():
    """
    Called from React dashboard when user clicks WAIT or DO NOT DISTURB.
    Body: {"action": "WAIT"} or {"action": "DO_NOT_DISTURB"}
    """
    action = (request.get_json(silent=True) or {}).get("action")
    if action not in ("WAIT", "DO_NOT_DISTURB"):
        return jsonify({"success": False, "message": "Invalid action"}), 400
    controller.respond(action)
    return jsonify({"success": True})

# ─────────────────────────────────────────────────────────────
# SETUP ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.route("/api/config")
def api_config():
    cfg = config_store.load()
    return jsonify({
        "first_run":   cfg.get("first_run", True),
        "wifi_ssid":   cfg.get("wifi_ssid", ""),
        "server_ip":   cfg.get("server_ip", "127.0.0.1"),
        "server_port": cfg.get("server_port", 8080),
    })


@app.route("/api/wifi")
def api_wifi():
    return jsonify(get_wifi_info())


@app.route("/api/ports")
def api_ports():
    return jsonify({"ports": list_ports(), "auto": find_esp32_port()})


@app.route("/api/provision", methods=["POST"])
def api_provision():
    data        = request.get_json(silent=True) or {}
    port        = data.get("port")
    ssid        = data.get("ssid")
    password    = data.get("password")
    server_ip   = data.get("server_ip")
    server_port = int(data.get("server_port", 8080))

    if not all([port, ssid, password, server_ip]):
        return jsonify({"success": False, "message": "Missing required fields."}), 400

    result = send_credentials(port, ssid, password, server_ip, server_port)

    if result["success"]:
        config_store.set("wifi_ssid",   ssid)
        config_store.set("server_ip",   server_ip)
        config_store.set("server_port", server_port)
        config_store.set("first_run",   False)

    return jsonify(result)

@app.route("/api/emergency/respond", methods=["POST"])
def api_emergency_respond():
    data = request.get_json(silent=True) or {}
    response = data.get('response', '')
    if response in ('COMING', 'WAIT', 'DO_NOT_DISTURB'):
        controller.respond(response)
        Notifier.set_response(response)   # show confirmation toast
        return jsonify({"success": True, "message": "Response sent"})
    return jsonify({"success": False, "message": "Invalid response"}), 400

# ─────────────────────────────────────────────────────────────
# WEBSOCKET
# ─────────────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    """Push current state to browser immediately on WebSocket connect."""
    socketio.emit("state_update", controller.get_status())


# ─────────────────────────────────────────────────────────────
def create_app():
    controller.start()
    return app, socketio
