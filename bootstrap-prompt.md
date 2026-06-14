# התקנת קמפיינר 10X — מפגש 3

## הוראות ל-Claude Code

הרץ את כל השלבים לפי הסדר. זהה אוטומטית Mac או Windows והתאם את הפקודות.
בסוף — טבלת סטטוס אחת.

---

## שלב 1 — בדיקת Node.js

```bash
node --version
```

- גרסה 18+ → המשך
- לא קיים → עצור: "התקן Node.js מ-nodejs.org ואז הדבק שוב"

---

## שלב 2 — בדיקת Claude Code

הרץ את הפקודה המתאימה למערכת ההפעלה:

**Mac:**
```bash
claude --version 2>/dev/null || ~/.local/bin/claude --version 2>/dev/null || /opt/homebrew/bin/claude --version 2>/dev/null || echo "CLAUDE_NOT_FOUND"
```

**Windows (PowerShell):**
```powershell
where.exe claude 2>$null; if ($LASTEXITCODE -ne 0) { Write-Output "CLAUDE_NOT_FOUND" }
```

- נמצא → המשך
- `CLAUDE_NOT_FOUND` → עצור: "Claude Code לא מותקן. חזור להוראות מפגש 1"

---

## שלב 3 — הורדת הקבצים מ-GitHub

```bash
git clone https://github.com/asafyakov/campainer-10x-skills.git ~/campainer-10x-skills 2>/dev/null || git -C ~/campainer-10x-skills pull
```

- הצלחה → המשך
- שגיאה → עצור: "git לא מותקן. הורד מ-git-scm.com ואז הדבק שוב"

---

## שלב 4 — התקנת סקיל analytics

**Mac:**
```bash
mkdir -p ~/.claude/skills/analytics
cp ~/campainer-10x-skills/מפגש-3/analytics/SKILL.md ~/.claude/skills/analytics/SKILL.md
echo "analytics: OK"
```

**Windows:**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\analytics" | Out-Null
Copy-Item "$env:USERPROFILE\campainer-10x-skills\מפגש-3\analytics\SKILL.md" -Destination "$env:USERPROFILE\.claude\skills\analytics\SKILL.md"
Write-Output "analytics: OK"
```

---

## שלב 5 — התקנת campaigner-agent

**Mac:**
```bash
cd ~/campainer-10x-skills/מפגש-3/campaigner-agent && npm install && cd ~
```

**Windows:**
```powershell
Set-Location "$env:USERPROFILE\campainer-10x-skills\מפגש-3\campaigner-agent"
npm install
Set-Location $env:USERPROFILE
```

---

## שלב 6 — הפעלת Agent Server + Auto-start

**Mac:**
```bash
# עצור תהליך ישן אם קיים
lsof -ti :3141 2>/dev/null && kill $(lsof -ti :3141) && sleep 1 || true

# הפעל עכשיו
node ~/campainer-10x-skills/מפגש-3/campaigner-agent/bin/cli.js &
sleep 3

# הגדר auto-start עם כל הדלקת מחשב
NODE_BIN=$(which node || echo "/usr/local/bin/node")
AGENT_PATH="$HOME/campainer-10x-skills/מפגש-3/campaigner-agent/bin/cli.js"
PLIST="$HOME/Library/LaunchAgents/com.campaigner10x.agent.plist"

cat > "$PLIST" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.campaigner10x.agent</string>
    <key>ProgramArguments</key>
    <array><string>$NODE_BIN</string><string>$AGENT_PATH</string></array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>$HOME/.campaigner-agent.log</string>
    <key>StandardErrorPath</key><string>$HOME/.campaigner-agent.log</string>
</dict>
</plist>
PLIST_EOF

launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST"
```

**Windows:**
```powershell
# עצור תהליך ישן
$conn = Get-NetTCPConnection -LocalPort 3141 -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue; Start-Sleep 1 }

# הפעל עכשיו
$AgentPath = "$env:USERPROFILE\campainer-10x-skills\מפגש-3\campaigner-agent\bin\cli.js"
Start-Process -FilePath "node" -ArgumentList $AgentPath -WindowStyle Hidden
Start-Sleep 4

# הגדר auto-start עם Task Scheduler
$NodeBin = (where.exe node | Select-Object -First 1).Trim()
$Action = New-ScheduledTaskAction -Execute $NodeBin -Argument $AgentPath
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "Campaigner10X-Agent" -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
Write-Output "AUTO_START: OK"
```

---

## שלב 7 — בדיקת חיבור

**Mac:**
```bash
curl -s http://127.0.0.1:3141/health
```

**Windows:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:3141/health"
```

- מחזיר `"status":"ok"` → הכל עובד
- שגיאה → עצור: "Agent לא עלה. הרץ `node ~/campainer-10x-skills/מפגש-3/campaigner-agent/bin/cli.js` לראות שגיאות"

---

## שלב 8 — סיכום

הדפס:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌  Node.js:         [גרסה]
✅/❌  Claude Code:      [גרסה]
✅/❌  analytics:        מותקן
✅/❌  Agent Server:     רץ על 3141
✅/❌  Auto-start:       מופעל
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

אם הכל ✅:
> "הכל מוכן.
> פתח Chrome או Firefox ונכנס ל:
> https://agency-dashboard-10x.vercel.app
> הדשבורד יתחבר אוטומטית לקלוד קוד שלך."
