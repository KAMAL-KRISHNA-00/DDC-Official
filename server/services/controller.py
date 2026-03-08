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
        self.state_machine.update_meeting_status(meeting_active)
        state = self.state_machine.get_state()

        # Side-effects on transition
        if state == "INTERRUPTED" and self.previous_state != "INTERRUPTED":
            self.audio.mute()
            Notifier.interrupt()

        if state == "ACTIVE_MEETING" and self.previous_state == "INTERRUPTED":
            self.audio.unmute()
            Notifier.resume()

        if state == "EMERGENCY_PENDING" and self.previous_state != "EMERGENCY_PENDING":
            logging.info("[Controller] State entered EMERGENCY_PENDING")

        # Notify long-pollers + browser if state changed
        if state != self.previous_state:
            logging.info(f"[Controller] State → {state}")
            notify_state_change()                          # wakes ESP32 long-poll
            if self.socketio:
                self.socketio.emit("state_update",         # wakes browser
                                   self.get_status())

        self.previous_state = state

    # ── Actions called from Flask routes ─────────────────────

    def door_interrupt(self) -> bool:
        result = self.state_machine.door_interrupt()
        if result:
            notify_state_change()
            if self.socketio:
                self.socketio.emit("state_update", self.get_status())
        return result

    def emergency_request(self) -> bool:
        """Trigger the emergency FSM transition and show the notification popup."""
        logging.info(f"[Controller] Emergency request — current state: {self.state_machine.get_state()}")

        result = self.state_machine.emergency_request()
        if result:
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
        """response is 'WAIT', 'DO_NOT_DISTURB', or 'COMING'"""
        self.last_response = response
        self.state_machine.resolve_emergency()
        time.sleep(0.5)  # small delay so ESP32 sees the transition
        notify_state_change()
        if self.socketio:
            self.socketio.emit("state_update", self.get_status())
        logging.info(f"[Controller] Response sent: {response}")

    # ── Status payload ────────────────────────────────────────

    def get_status(self) -> dict:
        return {
            "state":         self.state_machine.get_state(),
            "mic_muted":     self.audio.is_muted(),
            "last_response": self.last_response,
        }
