---
name: telegram-bot
description: מתקין בוט טלגרם אישי שרץ על המחשב ומחובר לקלוד קוד. המשתמש שולח הודעה מהטלפון → קלוד מעבד → תשובה חוזרת. השתמש בסקיל הזה כשמשתמש אומר "חבר טלגרם לקלוד", "בוט טלגרם", "telegram bot", "סוכן טלגרם", "אני רוצה לדבר עם קלוד מהטלפון", או כל בקשה לחיבור טלגרם לקלוד קוד.
---

# Telegram Bot → Claude Code — התקנה

מטרה: להביא את המשתמש ממצב אפס לבוט עובד תוך 5 דקות, עם כמה שפחות שאלות.

---

## לפני שמתחילים — הסבר למשתמש

> "אתקין לך בוט טלגרם אישי שרץ על המחשב שלך. אחרי ההתקנה — תפתח טלגרם, תשלח /start לבוט, והוא יתחבר לקלוד קוד שלך."

---

## שלב 1 — זיהוי מערכת הפעלה

```bash
python3 --version 2>/dev/null || python --version 2>/dev/null || echo "MISSING"
uname -s 2>/dev/null || echo "Windows"
```

- `Darwin` → Mac
- `Linux` → Linux  
- שגיאה / "Windows" → Windows

---

## שלב 2 — בדיקת Python

**Mac:**
```bash
python3 --version
```
- 3.9–3.12 ✅ ממשיכים
- חסר או ישן מ-3.9:
  ```bash
  # בדוק אם יש brew
  which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  brew install python@3.11
  ```
  הסבר למשתמש: "⏳ מתקין Python — זה לוקח כמה דקות, תהיה סבלני..."

**Windows (CMD בלבד — לא PowerShell):**
```cmd
python --version
```
- 3.9–3.12 ✅ ממשיכים
- חסר: הגד למשתמש:
  > "❌ Python לא מותקן. בצע את הצעדים האלה:
  > 1. פתח https://python.org/downloads
  > 2. הורד את Python 3.11
  > 3. בהתקנה — חשוב מאוד! סמן ✅ **Add Python to PATH**
  > 4. אחרי ההתקנה — סגור ופתח מחדש את CMD
  > 5. כתוב לי 'מוכן' כשסיימת"

  המתן שיאשר, ואז המשך.

---

## שלב 3 — יצירת תיקייה והעתקת קבצים

תיקיית ההתקנה:
- Mac/Linux: `~/claude-telegram-bot/`
- Windows: `%USERPROFILE%\claude-telegram-bot\`

**Mac/Linux:**
```bash
SKILL_DIR="$(dirname "$0")"  # נתיב הסקיל הנוכחי
INSTALL=~/claude-telegram-bot
mkdir -p "$INSTALL"
cp -R "<SKILL_DIR>/template/." "$INSTALL/"
chmod +x "$INSTALL/start.command"
```

**Windows (CMD):**
```cmd
set INSTALL=%USERPROFILE%\claude-telegram-bot
mkdir "%INSTALL%"
xcopy /E /I "<SKILL_DIR>\template" "%INSTALL%"
```

> `<SKILL_DIR>` = הנתיב שבו נמצא SKILL.md הזה. קבל אותו ב-Bash עם `$(dirname "$0")` או זכור שהוא מגיע כ-`Base directory for this skill:` בתחילת הסקיל.

---

## שלב 4 — יצירת venv והתקנת חבילה

**Mac/Linux:**
```bash
cd ~/claude-telegram-bot
python3 -m venv venv
source venv/bin/activate
pip install pyTelegramBotAPI
```

**Windows (CMD — לא PowerShell!):**
```cmd
cd %USERPROFILE%\claude-telegram-bot
python -m venv venv
venv\Scripts\activate.bat
pip install pyTelegramBotAPI
```

⏳ זה לוקח חצי דקה. הסבר למשתמש מה קורה.

אם pip נכשל על Mac עם שגיאת `externally-managed-environment`:
```bash
python3 -m pip install --break-system-packages pyTelegramBotAPI
# או השתמש ב-venv שיצרנו (ה-venv עוקף את הבעיה)
```

---

## שלב 5 — טוקן BotFather

שאל את המשתמש **שאלה אחת בלבד**:

> "עכשיו נצטרך טוקן לבוט שלך. כך מקבלים אותו:
> 1. פתח טלגרם
> 2. חפש **@BotFather**
> 3. שלח לו: `/newbot`
> 4. הוא יבקש שם לבוט — תן לו שם (לדוגמה: MyClaudeBot)
> 5. הוא ישלח לך טוקן שנראה כך: `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ`
>
> שלח לי את הטוקן כשקיבלת אותו."

אחרי שמקבל טוקן — **אמת אותו לפני שממשיכים:**
```bash
TOKEN="הטוקן שקיבל"
curl -s "https://api.telegram.org/bot${TOKEN}/getMe"
```
- `"ok":true` ✅ ממשיכים
- שגיאה ❌: "הטוקן לא תקין — בדוק שהעתקת אותו במלואו ונסה שוב"

---

## שלב 6 — כתיבת config.py

כתוב את הקובץ `config.py` בתיקיית ההתקנה:

```python
# Telegram Bot Config — אל תשתף או תעלה לגיט!
TELEGRAM_BOT_TOKEN = "TOKEN_כאן"

# הID שלך — יתמלא אוטומטית בפעם הראשונה שתשלח /start
AUTHORIZED_USER_ID = None
```

החלף `TOKEN_כאן` בטוקן האמיתי.

---

## שלב 7 — הפעלה

**Mac:**
```bash
cd ~/claude-telegram-bot
source venv/bin/activate
nohup python3 bot.py > bot.log 2>&1 &
echo "✅ הבוט פועל ברקע"

# קיצור דרך בשולחן העבודה
ln -sf ~/claude-telegram-bot/start.command ~/Desktop/"🤖 Telegram Bot.command"
```

**Windows (CMD):**
```cmd
cd %USERPROFILE%\claude-telegram-bot
call venv\Scripts\activate.bat
start /B python bot.py > bot.log 2>&1
echo הבוט פועל
```

---

## שלב 8 — וידוא ✅

בדוק שהבוט עלה:
```bash
curl -s "https://api.telegram.org/bot${TOKEN}/getMe" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ הבוט פעיל! שם: @' + d['result']['username'])"
```

אחר כך אמור למשתמש:

> **"מוכן! עכשיו:**
> 1. פתח טלגרם
> 2. חפש את הבוט שלך לפי השם שנתת
> 3. שלח לו `/start`
> 4. הבוט יזהה אותך אוטומטית ויאשר את הגישה שלך
>
> **פקודות שתוכל להשתמש בהן:**
> `/new` — שיחה חדשה
> `/project` — מעבר בין תיקיות פרויקט
> `/plan <בקשה>` — קלוד מתכנן לפני שהוא עושה
> `/approve` — אשר וביצע את התכנית
> `/model` — החלף מודל (opus/sonnet/haiku)
> `/status` — איזו תיקייה פעילה עכשיו"

---

## פתרון תקלות

| תסמין | פתרון |
|--------|--------|
| `claude: command not found` | `npm install -g @anthropic-ai/claude-code` ואז הפעל מחדש |
| `ModuleNotFoundError: telebot` | `pip install pyTelegramBotAPI` בתוך ה-venv |
| הבוט לא עונה | בדוק `bot.log` לשגיאות; ודא שהבוט רץ: `ps aux | grep bot.py` |
| Windows: שגיאת הרשאות ב-PowerShell | השתמש ב-CMD בלבד, לא PowerShell |
| `❌ Claude CLI לא נמצא` | ודא שקלוד קוד מותקן ונגיש מהטרמינל |

---

## הוספת תמלול קולי (בעתיד)

הבוט הבסיסי לא כולל תמלול. כדי להוסיף:
> "בקש מקלוד קוד: 'הוסף תמלול קולי לבוט הטלגרם שלי ב-~/claude-telegram-bot/ — השתמש ב-Whisper API של OpenAI'"

קלוד יעשה זאת אוטומטית.
