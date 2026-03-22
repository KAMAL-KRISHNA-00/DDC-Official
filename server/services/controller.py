import time, threading, logging
from core.state_machine    import MeetingStateMachine
from core.meeting_detector import MeetingDetector
from core.audio_controller import AudioController
from core.notifier         import Notifier
from services.config_store import get
from services.long_poll    import notify_state_change

class DDCController:
    LOOP_INTERVAL = 1

    def __init__(self, socketio=None):
        self.socketio      = socketio
        self.state_machine = MeetingStateMachine(interrupt_timeout=get("interrupt_timeout"))
        self.audio         = AudioController()
        self.detector      = MeetingDetector()
        self.previous_state = None
        self._running       = False

        # Last response sent (shown on OLED after emergency resolved)
        self.last_response  = None

    def start(self):
        self._running = True
        threading.Thread(target=self._loop, daemon=True).start()
        logging.info("[Controller] Started (REST mode, no MQTT)")

    def stop(self):
        self._running = False
        self.audio.unmute()

    def _loop(self):
        while self._running:
            try:
                self._update()
            except Exception as e:
                logging.error(f"[Controller] Loop error: {e}")
            time.sleep(self.LOOP_INTERVAL)

    def _update(self):
        meeting_active = self.detector.detect_teams()

        # ── Manual unmute detection ────────────────────────────────────────
        # If the user manually unmutes the mic while we're in INTERRUPTED,
        # treat it as self-resolution: exit INTERRUPTED immediately, notify,
        # and skip the auto-unmute path below (mic is already unmuted).
        if (self.state_machine.get_state() == "INTERRUPTED"
                and not self.audio.is_muted()):
            logging.info("[Controller] Manual unmute detected — exiting INTERRUPTED")
            self.state_machine.cancel_interrupt(meeting_active)
            Notifier.resume()               # immediate notification
            notify_state_change()
            if self.socketio:
                self.socketio.emit("state_update", self.get_status())
            self.previous_state = self.state_machine.get_state()
            return  # next _update() cycle handles normal state tracking

        self.state_machine.update_meeting_status(meeting_active)
        state = self.state_machine.get_state()

        # ── Side-effects on state transitions ─────────────────────────────
        # Mute notification is fired immediately in door_interrupt() so we
        # don't fire it here — that would cause a double notification.
        if state == "INTERRUPTED" and self.previous_state != "INTERRUPTED":
            self.audio.mute()
            # Notifier.interrupt() intentionally omitted — already called in door_interrupt()

        if state == "ACTIVE_MEETING" and self.previous_state == "INTERRUPTED":
            # Guard: only unmute + notify if mic is still muted.
            # If user already manually unmuted, the early-return above handled it.
            if self.audio.is_muted():
                self.audio.unmute()
                Notifier.resume()

        if state == "EMERGENCY_PENDING" and self.previous_state != "EMERGENCY_PENDING":
            logging.info("[Controller] State entered EMERGENCY_PENDING")

        # Notify long-pollers + browser if state changed
        if state != self.previous_state:
            logging.info(f"[Controller] State → {state}")
            notify_state_change()
            if self.socketio:
                self.socketio.emit("state_update", self.get_status())

        self.previous_state = state


    # ── Actions called from Flask routes ─────────────────────

    def door_interrupt(self) -> bool:
        result = self.state_machine.door_interrupt()
        if result:
            # Mute immediately — don't wait for the _update() loop (up to 1s delay)
            self.audio.mute()
            Notifier.interrupt()
            notify_state_change()
            if self.socketio:
                self.socketio.emit("state_update", self.get_status())
        return result

    def manual_unmute(self):
        """Called when user clicks 'Unmute Microphone' in the popup.
        Immediately unmutes, exits INTERRUPTED, and updates all clients."""
        logging.info("[Controller] Manual unmute via popup")
        meeting_active = self.detector.detect_teams()
        self.state_machine.cancel_interrupt(meeting_active)
        self.audio.unmute()
        Notifier.resume()
        notify_state_change()
        if self.socketio:
            self.socketio.emit("state_update", self.get_status())


    def emergency_request(self) -> bool:
        """Trigger the emergency FSM transition and show the notification popup.
        
        The popup is fire-and-forget — the user's button click on the popup
        calls /api/emergency/respond, which routes to respond() asynchronously.
        """
        logging.info(f"[Controller] Emergency request — current state: {self.state_machine.get_state()}")

        result = self.state_machine.emergency_request()
        if result:
            # Clear stale response immediately so the ESP32 never sees an old
            # last_response value echoed back during a new EMERGENCY_PENDING.
            self.last_response = None
            notify_state_change()
            if self.socketio:
                self.socketio.emit("state_update", self.get_status())
            # Show popup — response arrives asynchronously via /api/emergency/respond
            Notifier.emergency()
            return True
        else:
            logging.warning("[Controller] Emergency request ignored — invalid state")
            return False

    def respond(self, response: str):
        """response is 'WAIT', 'DO_NOT_DISTURB', or 'COMING'.

        Resolves the emergency, notifies the ESP32 to show the response,
        then schedules a 5-second timer to clear the response so the
        device reverts to the real meeting state automatically.
        """
        self.last_response = response
        self.state_machine.resolve_emergency()
        # If we resolved back to IDLE (no meeting was active), unmute audio.
        if self.state_machine.get_state() == "IDLE":
            self.audio.unmute()
        time.sleep(0.5)  # small delay so ESP32 sees the EMERGENCY_PENDING→state transition
        notify_state_change()
        if self.socketio:
            self.socketio.emit("state_update", self.get_status())
        logging.info(f"[Controller] Response sent: {response}")

        # After 5 seconds, clear the response so:
        #   1. ESP32 long-poll wakes and shows the real room state
        #   2. Next emergency press shows a fresh popup (no stale response)
        def _clear_response():
            logging.info("[Controller] Clearing response after 5s display timeout")
            self.last_response = None
            notify_state_change()
            if self.socketio:
                self.socketio.emit("state_update", self.get_status())

        threading.Timer(5.0, _clear_response).start()


    # ── Status payload ────────────────────────────────────────

    def get_status(self) -> dict:
        return {
            "state":         self.state_machine.get_state(),
            "mic_muted":     self.audio.is_muted(),
            "last_response": self.last_response,
        }
