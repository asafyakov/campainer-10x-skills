#!/bin/bash
# הפעלת Agent Server — קמפיינר 10X
# Mac בלבד. הרץ: bash start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# עצור agent ישן אם רץ
lsof -ti :3141 2>/dev/null && kill $(lsof -ti :3141) && sleep 1

# הפעל
node "$SCRIPT_DIR/campaigner-agent/bin/cli.js" &

sleep 2

# בדוק
if curl -s http://127.0.0.1:3141/health | grep -q '"status":"ok"'; then
  echo ""
  echo "✅ Agent Server רץ — http://127.0.0.1:3141"
  echo "   פתח את הדשבורד: https://agency-dashboard-10x.vercel.app"
  echo "   (אל תסגור את הטרמינל)"
  echo ""
else
  echo ""
  echo "❌ Agent Server לא עלה."
  echo "   נסה: node campaigner-agent/bin/cli.js"
  echo ""
fi
