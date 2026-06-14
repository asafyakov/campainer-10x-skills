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
mkdir -p ~/.claude/skills/analytics
cp analytics/SKILL.md ~/.claude/skills/analytics/SKILL.md
echo "analytics: OK"
```

- `analytics: OK` → המשך
- שגיאה → בדוק שקובץ `analytics/SKILL.md` קיים בתיקייה הנוכחית

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
```

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

אם הכל ✅:
> "הכל מוכן.
> 
> פתח את הדשבורד בדפדפן (Chrome או Firefox):
> https://agency-dashboard-10x.vercel.app
> 
> הדשבורד יתחבר אוטומטית לקלוד קוד שלך תוך שניות.
> השאר את הטרמינל פתוח בזמן העבודה."

אם יש ❌ — פרט מה לתקן, צעד אחד בכל פעם.

---

## שימוש לאחר ההתקנה

| פקודה | מה עושה |
|-------|---------|
| `/analytics` | ניתוח קמפיין + המלצות |
| `node campaigner-agent/bin/cli.js &` | הפעלת Agent Server (כל פתיחה) |
| `http://127.0.0.1:3141/health` | בדיקת סטטוס Agent |

**טיפ:** הוסף לתחילת כל שיחת עבודה: `node campaigner-agent/bin/cli.js &` כדי שהדשבורד יהיה מחובר.

---

## Troubleshooting

| בעיה | פתרון |
|------|-------|
| Safari לא רואה את ה-Agent | עבור ל-Chrome או Firefox |
| פורט 3141 תפוס | `kill $(lsof -ti :3141)` ואז הפעל מחדש |
| `npm install` נכשל | `rm -rf campaigner-agent/node_modules && cd campaigner-agent && npm install` |
| לקוח לא מופיע בדשבורד | ודא שיש קובץ `CLAUDE.md` בתיקיית הלקוח |
