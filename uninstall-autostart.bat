@echo off
title CHAT AI - Remove Windows Auto-Start
color 0C
echo ========================================================
echo        CHAT AI - Remove Windows Auto-Start
echo ========================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_VBS=%STARTUP_FOLDER%\CHAT-AI-AutoStart.vbs"

if exist "%STARTUP_VBS%" (
    del /f /q "%STARTUP_VBS%"
    echo [OK] Removed auto-start script from Windows Startup folder.
) else (
    echo [INFO] Auto-start script was not found in Startup folder.
)

set "DESKTOP_URL=%USERPROFILE%\Desktop\CHAT AI.url"
if exist "%DESKTOP_URL%" (
    del /f /q "%DESKTOP_URL%"
    echo [OK] Removed Desktop shortcut.
)

echo.
echo ========================================================
echo [SUCCESS] Auto-start has been disabled.
echo ========================================================
echo.
pause
