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

def wait_for_change(timeout: float = 20.0) -> bool:
    """
    Blocks until state changes or timeout expires.
    Returns True if state changed, False if timed out.
    Timeout is 20 s — well under most home-router NAT session limits
    (which silently drop idle TCP connections at ~25-30 s).
    The ESP32 reconnects immediately on timeout, so this is safe.
    """
    with _lock:
        snapshot = _version
        return _lock.wait_for(lambda: _version != snapshot, timeout=timeout)
