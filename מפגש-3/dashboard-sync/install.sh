#!/bin/bash
# dashboard-sync — התקנה חד-פעמית
# הרץ: bash install.sh

set -e

SKILL_DIR="$HOME/.claude/skills/dashboard-sync"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "📦 מתקין dashboard-sync..."

# יצור תיקיית skills אם לא קיימת
mkdir -p "$HOME/.claude/skills"

# העתק את הסקיל
if [ "$SCRIPT_DIR" != "$SKILL_DIR" ]; then
    cp -r "$SCRIPT_DIR" "$SKILL_DIR"
    echo "✅ סקיל הועתק ל: $SKILL_DIR"
else
    echo "✅ סקיל כבר במיקום הנכון: $SKILL_DIR"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ התקנה הושלמה!"
echo ""
echo "📋 הצעד הבא:"
echo "   1. פתח את תיקיית הלקוחות שלך ב-Claude Code"
echo "   2. כתוב: /dashboard-sync setup"
echo "   3. הדבק את ה-API Key מהדשבורד — הכל ייעשה אוטומטית"
echo ""
echo "🔑 קבל API Key: https://agency-dashboard-10x.vercel.app → הגדרות → מפתחות API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
