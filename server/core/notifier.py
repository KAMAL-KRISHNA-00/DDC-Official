from plyer import notification
import logging
import threading
import webbrowser
import subprocess
import platform


class Notifier:

    @staticmethod
    def _notify(title: str, message: str, timeout: int = 5):
        try:
            notification.notify(title=title, message=message, timeout=timeout)
        except Exception as e:
            logging.error(f"[Notifier] {e}")

    @classmethod
    def _show_emergency_popup(cls):
        """
        Show a Windows Forms popup. Each button calls the local REST endpoint
        via PowerShell's Invoke-WebRequest so the response crosses the
        process boundary correctly — Python class variables cannot be set
        from a subprocess.
        """
        try:
            if platform.system() == "Windows":
                script = r'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$api = "http://localhost:8080/api/emergency/respond"

$form = New-Object System.Windows.Forms.Form
$form.Text = "EMERGENCY REQUEST"
$form.Size = New-Object System.Drawing.Size(320,160)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = "Someone needs you. Choose your response:"
$label.Location = New-Object System.Drawing.Point(20,20)
$label.Size = New-Object System.Drawing.Size(280,30)
$form.Controls.Add($label)

function Send-Response($resp) {
    $body = "{`"response`":`"$resp`"}"
    try {
        Invoke-WebRequest -Uri $api -Method POST -Body $body `
            -ContentType "application/json" -UseBasicParsing | Out-Null
    } catch {}
    $form.Close()
}

$btn1 = New-Object System.Windows.Forms.Button
$btn1.Text = "Coming (2 min)"
$btn1.Location = New-Object System.Drawing.Point(20,70)
$btn1.Size = New-Object System.Drawing.Size(85,30)
$btn1.Add_Click({ Send-Response "COMING" })
$form.Controls.Add($btn1)

$btn2 = New-Object System.Windows.Forms.Button
$btn2.Text = "Please Wait"
$btn2.Location = New-Object System.Drawing.Point(115,70)
$btn2.Size = New-Object System.Drawing.Size(85,30)
$btn2.Add_Click({ Send-Response "WAIT" })
$form.Controls.Add($btn2)

$btn3 = New-Object System.Windows.Forms.Button
$btn3.Text = "Do Not Disturb"
$btn3.Location = New-Object System.Drawing.Point(210,70)
$btn3.Size = New-Object System.Drawing.Size(90,30)
$btn3.Add_Click({ Send-Response "DO_NOT_DISTURB" })
$form.Controls.Add($btn3)

$form.ShowDialog() | Out-Null
'''
                subprocess.Popen(
                    ['powershell', '-NoProfile', '-NonInteractive', '-Command', script],
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            else:
                # Non-Windows fallback: open the dashboard
                cls._notify(
                    "EMERGENCY REQUEST",
                    "Open the dashboard to respond.",
                    timeout=30
                )
                webbrowser.open("http://localhost:8080")
        except Exception as e:
            logging.error(f"[Notifier] Emergency popup failed: {e}")
            cls._notify("EMERGENCY REQUEST", "Open dashboard to respond", timeout=30)
            webbrowser.open("http://localhost:8080")

    @classmethod
    def interrupt(cls):
        """Mute notification + popup window to manually unmute."""
        cls._notify("Microphone Muted", "Door interaction detected. Click to unmute.")
        threading.Thread(target=cls._show_interrupt_popup, daemon=True).start()

    @classmethod
    def _show_interrupt_popup(cls):
        """Show a popup with an Unmute button, just like the emergency popup."""
        try:
            if platform.system() == "Windows":
                script = r'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$api = "http://localhost:8080/api/interrupt/unmute"

$form = New-Object System.Windows.Forms.Form
$form.Text = "MICROPHONE MUTED"
$form.Size = New-Object System.Drawing.Size(300,140)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = "Mic muted due to door interaction."
$label.Location = New-Object System.Drawing.Point(20,20)
$label.Size = New-Object System.Drawing.Size(260,30)
$form.Controls.Add($label)

$btnUnmute = New-Object System.Windows.Forms.Button
$btnUnmute.Text = "Unmute Microphone"
$btnUnmute.Location = New-Object System.Drawing.Point(80,65)
$btnUnmute.Size = New-Object System.Drawing.Size(140,30)
$btnUnmute.Add_Click({
    try {
        Invoke-WebRequest -Uri $api -Method POST `
            -ContentType "application/json" -UseBasicParsing | Out-Null
    } catch {}
    $form.Close()
})
$form.Controls.Add($btnUnmute)

$form.ShowDialog() | Out-Null
'''
                subprocess.Popen(
                    ['powershell', '-NoProfile', '-NonInteractive', '-Command', script],
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            else:
                cls._notify("Microphone Muted", "Open the dashboard to unmute.", timeout=30)
        except Exception as e:
            logging.error(f"[Notifier] Interrupt popup failed: {e}")



    @classmethod
    def resume(cls):
        cls._notify("Meeting Resumed", "Microphone restored.")

    @classmethod
    def emergency(cls):
        """
        Show the emergency popup. The popup calls /api/emergency/respond via
        Invoke-WebRequest, which routes to controller.respond() — so this
        method returns immediately; the response arrives asynchronously.
        """
        logging.info("[Notifier] Emergency triggered — showing popup")
        cls._show_emergency_popup()

    @classmethod
    def set_response(cls, response: str):
        """Show a confirmation toast after the response is sent."""
        messages = {
            "COMING":         "Coming now — 2 minutes",
            "WAIT":           "Please wait — busy",
            "DO_NOT_DISTURB": "Do not disturb",
        }
        cls._notify("Response Sent", messages.get(response, f"Response: {response}"))
