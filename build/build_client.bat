@echo off
setlocal
cd /D "%~dp0..\client"

echo [1/2] Installing npm packages...
npm install
if errorlevel 1 goto :fail_install

echo [2/2] Building React app...
npm run build
if errorlevel 1 goto :fail_build

echo.
echo Done. Output copied to server\static\
exit /b 0

:fail_install
echo ERROR: npm install failed.
exit /b 1

:fail_build
echo ERROR: npm build failed.
exit /b 1
