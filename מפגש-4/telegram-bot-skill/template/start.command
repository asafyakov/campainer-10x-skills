#!/bin/bash
# Telegram Bot — double-click to start (Mac)
cd "$(dirname "$0")"

pkill -f "python.*bot.py" 2>/dev/null
sleep 1

source venv/bin/activate
echo "🤖 מפעיל בוט טלגרם..."
python3 bot.py
