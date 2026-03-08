@echo off
setlocal
cd /D "%~dp0"

echo.
echo ============================================
echo   Deep Work Concierge -- Full Build Pipeline
echo ============================================
echo.

:: Step 1: Frontend
echo [Step 1/2] Building React frontend...
call build_client.bat
if errorlevel 1 goto :fail_client
echo [Step 1/2] Frontend OK.
echo.

:: Step 2: PyInstaller EXE
echo [Step 2/2] Building Python EXE...
call build_exe.bat
if errorlevel 1 goto :fail_exe
echo [Step 2/2] EXE OK.
echo.

echo ============================================
echo              BUILD COMPLETE
echo ============================================
echo.
echo   EXE: server\dist\DDC\DDC.exe
echo.
echo Next step -- create the installer:
echo   1. Open build\setup.iss in Inno Setup Compiler
echo   2. Press Ctrl+F9 to compile
echo   3. Installer: build\Output\DDC_Installer.exe
echo.
pause
exit /b 0

:fail_client
echo.
echo BUILD FAILED at Step 1 (frontend). Fix errors above and retry.
pause
exit /b 1

:fail_exe
echo.
echo BUILD FAILED at Step 2 (PyInstaller). Fix errors above and retry.
pause
exit /b 1
