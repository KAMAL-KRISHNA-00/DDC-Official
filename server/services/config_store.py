import json, os
from pathlib import Path

CONFIG_DIR  = Path(os.getenv("APPDATA")) / "DeepWorkConcierge"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULTS = {
    "interrupt_timeout": 10,
    "first_run":         True,
    "wifi_ssid":         "",
    "server_ip":         "127.0.0.1",
    "server_port":       8080,
}

def load() -> dict:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_FILE.exists():
        save(DEFAULTS.copy())
        return DEFAULTS.copy()
    with open(CONFIG_FILE) as f:
        data = json.load(f)
    for k, v in DEFAULTS.items():
        data.setdefault(k, v)
    return data

def save(config: dict):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

def get(key: str):
    return load().get(key, DEFAULTS.get(key))

def set(key: str, value):
    config = load()
    config[key] = value
    save(config)
