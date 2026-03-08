import psutil
import logging

class MeetingDetector:
    TEAMS_PROCESS_NAMES = {"ms-teams.exe", "msteams.exe", "teams.exe"}

    def __init__(self):
        self._last_detected = False

    def detect_teams(self) -> bool:
        try:
            for proc in psutil.process_iter(['name', 'cmdline']):
                name = proc.info.get('name')
                cmdline = proc.info.get('cmdline')
                if not name:
                    continue
                name = name.lower()
                if name == "msedgewebview2.exe" and cmdline:
                    if "msteams" in " ".join(cmdline).lower():
                        return True
                if name in self.TEAMS_PROCESS_NAMES:
                    return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        except Exception as e:
            logging.error(f"[MeetingDetector] Error: {e}")
        return False
