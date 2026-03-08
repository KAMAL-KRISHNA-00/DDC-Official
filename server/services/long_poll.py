import threading

# Version counter: incremented on every state change.
# Waiters snapshot it before blocking and compare after waking —
# this guarantees they never miss a notification (no set/clear race).
_lock    = threading.Condition(threading.Lock())
_version = 0

def notify_state_change():
    """Increment version and wake all waiting long-poll threads."""
    global _version
    with _lock:
        _version += 1
        _lock.notify_all()

def wait_for_change(timeout: float = 30.0) -> bool:
    """
    Blocks until state changes or timeout expires.
    Returns True if state changed, False if timed out.
    ESP32 uses a 30 s timeout then reconnects — normal behaviour.
    """
    with _lock:
        snapshot = _version
        return _lock.wait_for(lambda: _version != snapshot, timeout=timeout)
