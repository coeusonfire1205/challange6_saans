@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or newer, then run this file again.
 pause
 exit /b 1
)
start "Saans browser" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:3060"
node --env-file-if-exists=.env server.mjs
pause
