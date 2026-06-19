@echo off
chcp 65001 >nul
cd /d "%~dp0"
taskkill /F /IM python.exe /FI "WINDOWTITLE eq bot.py" 2>nul
echo מפעיל בוט טלגרם...
call venv\Scripts\activate.bat
python bot.py
pause
