@echo off
title CHAT AI - Offline Mode Setup (Ollama + Llama 3.2)
echo ===================================================================
echo               CHAT AI - Offline Mode Automatic Setup
echo ===================================================================
echo.
echo This script sets up 100%% offline, private AI on your computer.
echo.

REM Check if Ollama is already in PATH
where ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Ollama is already installed!
    goto run_model
)

REM Check default local AppData path
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    echo [OK] Ollama found in %LOCALAPPDATA%\Programs\Ollama!
    set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
    goto run_model
)

echo [1/2] Downloading Ollama for Windows...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://ollama.com/download/OllamaSetup.exe', 'OllamaSetup.exe')"

if not exist "OllamaSetup.exe" (
    echo [!] Download failed. Opening browser download page...
    start https://ollama.com/download/OllamaSetup.exe
    echo Please install Ollama from your browser, then run this script again.
    pause
    exit /b 1
)

echo.
echo [2/2] Running Ollama Setup...
echo Please follow the on-screen installer (takes ~30 seconds).
start /wait OllamaSetup.exe

set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"

:run_model
echo.
echo ===================================================================
echo   Downloading Meta Llama 3.2 (Lightweight, ultra-fast 3B model)
echo ===================================================================
echo.
echo This model runs completely offline on your computer.
echo Downloading model weights (approx 2GB, one-time only)...
echo.
ollama run llama3.2

echo.
echo [DONE] Llama 3.2 is now installed and ready!
echo Go to CHAT AI (http://localhost:3000) and chat in Offline Mode!
pause

