@echo off
setlocal
cd /D "%~dp0..\server"

echo.
echo ====================================
echo   Building DDC.exe (PyInstaller)
echo ====================================
echo.

:: Use the venv python so we get exactly the installed packages
set PYTHON=.venv\Scripts\python.exe
if not exist %PYTHON% goto :no_venv

%PYTHON% -m PyInstaller ^
  --noconfirm ^
  --onedir ^
  --windowed ^
  --name "DDC" ^
  --add-data "static;static" ^
  --hidden-import=engineio.async_drivers.threading ^
  --hidden-import=engineio.async_drivers.eventlet ^
  --hidden-import=flask_socketio ^
  --hidden-import=socketio ^
  --hidden-import=socketio.exceptions ^
  --hidden-import=pycaw ^
  --hidden-import=comtypes ^
  --hidden-import=comtypes.stream ^
  --hidden-import=comtypes.client ^
  --hidden-import=plyer.platforms.win.notification ^
  --hidden-import=plyer.platforms.win ^
  --hidden-import=serial ^
  --hidden-import=serial.tools.list_ports ^
  --hidden-import=serial.tools.list_ports_windows ^
  --hidden-import=psutil ^
  --hidden-import=pkg_resources.py2_warn ^
  --collect-all engineio ^
  --collect-all socketio ^
  --collect-all flask_socketio ^
  --collect-all plyer ^
  run.py

if errorlevel 1 goto :fail

echo.
echo Done! EXE at: server\dist\DDC\DDC.exe
exit /b 0

:no_venv
echo ERROR: .venv not found in server\
echo Run: py -3.12 -m venv .venv
echo Then: .venv\Scripts\pip install -r ..\requirements.txt
exit /b 1

:fail
echo.
echo ERROR: PyInstaller build failed. Check output above.
exit /b 1
