# התקנת מפגש 3 — ניתוח נתונים + דשבורד סוכנות

> הדבק את כל הקובץ הזה ל-Claude Code. הוא יתקין הכל ויחזיר לך סטטוס.

---

## הוראות ל-Claude Code

הרץ את כל השלבים לפי הסדר. אל תדלג. אם שלב נכשל — תקן ורק אז המשך.
בסוף — טבלת סטטוס אחת ברורה.

---

## שלב 1 — בדיקת Node.js

```bash
node --version
```

- גרסה 18+ → המשך
- `command not found` → עצור: "התקן Node.js מ-nodejs.org ואז חזור להריץ את זה"

---

## שלב 2 — מציאת Claude Code

```bash
claude --version 2>/dev/null || \
~/.local/bin/claude --version 2>/dev/null || \
/usr/local/bin/claude --version 2>/dev/null || \
/opt/homebrew/bin/claude --version 2>/dev/null || \
echo "CLAUDE_NOT_FOUND"
```

- מחזיר גרסה → המשך
- `CLAUDE_NOT_FOUND` → עצור: "Claude Code לא נמצא. חזור להוראות מפגש 1"

---

## שלב 3 — זיהוי תיקיית מפגש 3

מצא את הנתיב שבו אנחנו נמצאים עכשיו:

```bash
pwd
```

שמור את הנתיב הזה — כל שאר הפעולות מתבצעות ממנו.

---

## שלב 4 — התקנת סקיל analytics

```bash
ls analytics/SKILL.md 2>/dev/null && echo "SKILL_FOUND" || echo "SKILL_MISSING"
```

- `SKILL_MISSING` → עצור: "הקובץ analytics/SKILL.md לא נמצא. ודא שאתה נמצא בתיקיית מפגש-3 ושהורדת את כל ה-repo"
- `SKILL_FOUND` → הרץ:

```bash
mkdir -p ~/.claude/skills/analytics
cp analytics/SKILL.md ~/.claude/skills/analytics/SKILL.md
echo "analytics: OK"
```

---

## שלב 5 — התקנת campaigner-agent

```bash
ls campaigner-agent/package.json 2>/dev/null && echo "FOUND" || echo "MISSING"
```

- `FOUND` → הרץ: `cd campaigner-agent && npm install && cd ..`
- `MISSING` → עצור: "תיקיית campaigner-agent חסרה. ודא שהורדת את כל תיקיית מפגש 3 כולה"

---

## שלב 6 — ניקוי פורט + הפעלת Agent Server

```bash
lsof -ti :3141 2>/dev/null && kill $(lsof -ti :3141) && sleep 1 || true
node campaigner-agent/bin/cli.js &
sleep 3
pgrep -f "campaigner-agent/bin/cli.js" && echo "AGENT_RUNNING" || echo "AGENT_FAILED"
```

- `AGENT_RUNNING` → המשך
- `AGENT_FAILED` → עצור: "השרת לא עלה. הרץ `node campaigner-agent/bin/cli.js` בלי & כדי לראות את השגיאה"

---

## שלב 7 — בדיקת Agent Server

```bash
curl -s http://127.0.0.1:3141/health
```

בדוק:
- `"status":"ok"` → תקין
- `"claude":{"ready":true}` → Claude Code מחובר
- `"clientCount"` → כמה לקוחות נמצאו בתיקייה

שגיאה / אין תגובה → עצור: "Agent Server לא עלה. בדוק שגיאות בטרמינל"

---

## שלב 8 — סיכום סטטוס

הדפס:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌  Node.js:            [גרסה]
✅/❌  Claude Code:         [גרסה + נתיב]
✅/❌  סקיל analytics:     מותקן ב-~/.claude/skills/analytics/
✅/❌  campaigner-agent:   מותקן + רץ
✅/❌  Agent Server:        localhost:3141 — [status]
✅/❌  לקוחות שנמצאו:      [מספר]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

אם הכל ✅ — המשך לשלב 9.
אם יש ❌ — פרט מה לתקן, צעד אחד בכל פעם.

---

## שלב 9 — Auto-start (הפעלה אוטומטית עם הדלקת המחשב)

מגדיר את ה-Agent להפעיל אוטומטית בכל פעם שהמחשב עולה — לא צריך לזכור כלום.

```bash
NODE_BIN=$(which node || echo "/usr/local/bin/node")
AGENT_DIR="$(pwd)/campaigner-agent"
PLIST="$HOME/Library/LaunchAgents/com.campaigner10x.agent.plist"

cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.campaigner10x.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$AGENT_DIR/bin/cli.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/.campaigner-agent.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.campaigner-agent.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST"
echo "AUTO_START: OK"
```

- `AUTO_START: OK` → הכל מוכן. ה-Agent יעלה אוטומטית מעכשיו
- שגיאה → כתוב: "Auto-start נכשל — הרץ `bash start.sh` ידנית לפני עבודה"

---

## סיכום סופי

הדפס:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌  Node.js:            [גרסה]
✅/❌  Claude Code:         [גרסה + נתיב]
✅/❌  סקיל analytics:     מותקן
✅/❌  campaigner-agent:   מותקן + רץ
✅/❌  Agent Server:        localhost:3141
✅/❌  Auto-start:          מופעל
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> "הכל מוכן.
>
> פתח את הדשבורד בדפדפן (Chrome או Firefox):
> https://agency-dashboard-10x.vercel.app
>
> הדשבורד יתחבר אוטומטית — עכשיו ובכל פעם שתדליק את המחשב."

---

## Troubleshooting

| בעיה | פתרון |
|------|-------|
| Safari לא רואה את ה-Agent | עבור ל-Chrome או Firefox |
| פורט 3141 תפוס | `kill $(lsof -ti :3141)` ואז הפעל מחדש |
| `npm install` נכשל | `rm -rf campaigner-agent/node_modules && cd campaigner-agent && npm install` |
| לקוח לא מופיע בדשבורד | ודא שיש קובץ `CLAUDE.md` בתיקיית הלקוח |
