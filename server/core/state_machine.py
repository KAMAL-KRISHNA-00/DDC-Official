import time
import logging

class MeetingStateMachine:
    IDLE = "IDLE"
    ACTIVE_MEETING = "ACTIVE_MEETING"
    INTERRUPTED = "INTERRUPTED"
    EMERGENCY_PENDING = "EMERGENCY_PENDING"

    def __init__(self, interrupt_timeout=10):
        self._state = self.IDLE
        self._last_interrupt_time = 0
        self._interrupt_timeout = interrupt_timeout
        self._state_before_emergency = self.IDLE

    def update_meeting_status(self, meeting_active: bool):
        if self._state == self.EMERGENCY_PENDING:
            self._state_before_emergency = (
                self.ACTIVE_MEETING if meeting_active else self.IDLE
            )
            return
        if self._state == self.INTERRUPTED:
            if self._interrupt_expired():
                self._state = (
                    self.ACTIVE_MEETING if meeting_active else self.IDLE
                )
            return
        if meeting_active and self._state == self.IDLE:
            self._state = self.ACTIVE_MEETING
        elif not meeting_active:
            self._state = self.IDLE

    def door_interrupt(self) -> bool:
        if self._state == self.ACTIVE_MEETING:
            self._state = self.INTERRUPTED
            self._last_interrupt_time = time.time()
            return True
        return False

    def cancel_interrupt(self, meeting_active: bool) -> bool:
        """Immediately exit INTERRUPTED — called when user manually unmutes.
        Skips the timeout, transitions straight to the correct state."""
        if self._state == self.INTERRUPTED:
            self._state = self.ACTIVE_MEETING if meeting_active else self.IDLE
            logging.info(f"[FSM] Interrupt cancelled by manual unmute → {self._state}")
            return True
        return False

    def emergency_request(self) -> bool:
        if self._state != self.EMERGENCY_PENDING:
            self._state_before_emergency = (
                self.ACTIVE_MEETING
                if self._state in (self.ACTIVE_MEETING, self.INTERRUPTED)
                else self.IDLE
            )
            self._state = self.EMERGENCY_PENDING
            return True
        return False

    def resolve_emergency(self):
        """Resolve the emergency and return to the correct prior state."""
        if self._state == self.EMERGENCY_PENDING:
            self._state = self._state_before_emergency
            logging.info(f"[FSM] Emergency resolved → {self._state}")

    def get_state(self) -> str:
        return self._state

    def _interrupt_expired(self) -> bool:
        return (time.time() - self._last_interrupt_time) > self._interrupt_timeout
