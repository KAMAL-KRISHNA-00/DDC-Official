import os, sys, threading, webbrowser, time, logging
from pathlib import Path

os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    filename="logs/app.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s"
)

from app import create_app

PORT = 8080

def _open_browser():
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    app, socketio = create_app()
    threading.Thread(target=_open_browser, daemon=True).start()
    print(f"\n  Deep Work Concierge -> http://localhost:{PORT}\n")
    socketio.run(app, host="0.0.0.0", port=PORT,
                 debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
