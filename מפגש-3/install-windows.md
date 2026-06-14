# התקנת מפגש 3 — ניתוח נתונים + דשבורד סוכנות (Windows)

> הדבק את כל הקובץ הזה ל-Claude Code. הוא יתקין הכל ויחזיר לך סטטוס.
> **גרסת Windows — פקודות PowerShell.**

---

## הוראות ל-Claude Code

הרץ את כל השלבים לפי הסדר. אל תדלג. אם שלב נכשל — תקן ורק אז המשך.
בסוף — טבלת סטטוס אחת ברורה.
**השתמש ב-PowerShell לכל הפקודות.**

---

## שלב 1 — בדיקת Node.js

```powershell
node --version
```

- גרסה 18+ → המשך
- `'node' is not recognized` → עצור: "התקן Node.js מ-nodejs.org ואז הפעל מחדש את Claude Code"

---

## שלב 2 — מציאת Claude Code

```powershell
where.exe claude 2>$null
if ($LASTEXITCODE -ne 0) { Write-Output "CLAUDE_NOT_FOUND" }
```

- מחזיר נתיב → המשך
- `CLAUDE_NOT_FOUND` → עצור: "Claude Code לא נמצא. חזור להוראות מפגש 1"

---

## שלב 3 — זיהוי תיקיית מפגש 3

```powershell
Get-Location
```

שמור את הנתיב הזה — כל שאר הפעולות מתבצעות ממנו.

---

## שלב 4 — התקנת סקיל analytics

```powershell
Test-Path analytics\SKILL.md
```

- `False` → עצור: "הקובץ analytics\SKILL.md לא נמצא. ודא שאתה נמצא בתיקיית מפגש-3 ושהורדת את כל ה-repo"
- `True` → הרץ:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\analytics" | Out-Null
Copy-Item analytics\SKILL.md -Destination "$env:USERPROFILE\.claude\skills\analytics\SKILL.md"
Write-Output "analytics: OK"
```

---

## שלב 5 — התקנת campaigner-agent

```powershell
Test-Path campaigner-agent\package.json
```

- `False` → עצור: "תיקיית campaigner-agent חסרה. ודא שהורדת את כל תיקיית מפגש 3 כולה"
- `True` → הרץ:

```powershell
Set-Location campaigner-agent
npm install
Set-Location ..
```

---

## שלב 6 — ניקוי פורט + הפעלת Agent Server

```powershell
$pid3141 = (netstat -ano | Select-String ":3141 .*LISTEN").ToString().Split()[-1]
if ($pid3141) { Stop-Process -Id $pid3141 -Force -ErrorAction SilentlyContinue; Start-Sleep 1 }

Start-Process -FilePath "node" -ArgumentList "campaigner-agent\bin\cli.js" -NoNewWindow -PassThru
Start-Sleep 3

$agentProc = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*campaigner-agent*" }
if ($agentProc) { Write-Output "AGENT_RUNNING" } else { Write-Output "AGENT_FAILED" }
```

- `AGENT_RUNNING` → המשך
- `AGENT_FAILED` → עצור: "השרת לא עלה. הרץ `node campaigner-agent\bin\cli.js` ישירות לראות את השגיאה"

---

## שלב 7 — בדיקת Agent Server

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3141/health" -UseBasicParsing | Select-Object -ExpandProperty Content
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
✅/❌  Claude Code:         [נתיב]
✅/❌  סקיל analytics:     מותקן ב-%USERPROFILE%\.claude\skills\analytics\
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
| `Start-Process node -ArgumentList "campaigner-agent\bin\cli.js" -NoNewWindow` | הפעלת Agent Server (כל פתיחה) |
| `http://127.0.0.1:3141/health` | בדיקת סטטוס Agent |

---

## Troubleshooting

| בעיה | פתרון |
|------|-------|
| Edge לא רואה את ה-Agent | עבור ל-Chrome או Firefox |
| פורט 3141 תפוס | `Stop-Process -Id (netstat -ano \| Select-String ":3141").ToString().Split()[-1] -Force` |
| `npm install` נכשל | `Remove-Item -Recurse -Force campaigner-agent\node_modules; cd campaigner-agent; npm install` |
| לקוח לא מופיע בדשבורד | ודא שיש קובץ `CLAUDE.md` בתיקיית הלקוח |
| PowerShell חוסם הרצת סקריפטים | הרץ: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
