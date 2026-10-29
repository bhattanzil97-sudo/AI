@echo off
title CHAT AI - Windows Auto-Start Setup
color 0A
echo ========================================================
echo        CHAT AI - Configure Windows Auto-Start
echo ========================================================
echo.

set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_VBS=%STARTUP_FOLDER%\CHAT-AI-AutoStart.vbs"

echo [1/3] Detected Project Directory:
echo       "%PROJECT_DIR%"
echo.
echo [2/3] Installing silent background launcher to Windows Startup...
echo       Target: "%STARTUP_VBS%"

(
echo ' CHAT AI Windows Startup Launcher
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo Set fso = CreateObject^("Scripting.FileSystemObject"^)
echo projectDir = "%PROJECT_DIR%"
echo If fso.FolderExists^(projectDir^) Then
echo     WshShell.CurrentDirectory = projectDir
echo     cmdLine = "cmd.exe /c ""set PATH=C:\Users\LENOVO\AppData\Local\Programs\NodeJS;C:\Users\LENOVO\AppData\Local\Programs\MinGit\cmd;%%PATH%% && npm run dev"""
echo     WshShell.Run cmdLine, 0, False
echo End If
) > "%STARTUP_VBS%"

echo.
echo [3/3] Creating Desktop Shortcut for quick access (http://localhost:3000)...
set "DESKTOP_URL=%USERPROFILE%\Desktop\CHAT AI.url"
(
echo [InternetShortcut]
echo URL=http://localhost:3000
echo IconIndex=0
echo IconFile=%SystemRoot%\System32\shell32.dll
) > "%DESKTOP_URL%"

echo.
echo ========================================================
echo [SUCCESS] Windows Auto-Start has been configured!
echo.
echo  * CHAT AI will now start automatically whenever your laptop
echo    powers on or reboots.
echo  * It will run silently in the background on port 3000.
echo  * A "CHAT AI" shortcut has also been placed on your Desktop.
echo ========================================================
echo.
pause
