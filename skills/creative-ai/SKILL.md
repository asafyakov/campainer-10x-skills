---
name: creative-ai
description: מייצר קריאייטיבים למודעות פייסבוק/אינסטגרם דרך KIE AI. שני מצבים — מאפס (חומרים שיווקיים) או מווינרים (סוכן analytics ברקע). שימור פנים, QA אוטומטי, 4 וריאציות לכל זווית.
allowed-tools: Read, Write, Bash, Glob, Grep, Agent
---

# סקיל: creative-ai — יצירת קריאייטיבים עם AI

## מה הסקיל הזה עושה

מייצר קריאייטיבים למודעות פייסבוק/אינסטגרם באמצעות KIE AI.

**שני מצבים:**
1. **מאפס** — אין מודעות פעילות. קורא חומרים שיווקיים (CLAUDE.md, avatar, brief, דף נחיתה), מחלץ זוויות, מייצר קריאייטיבים
2. **מווינרים** — יש מודעות שרצות. שולח סוכן analytics ברקע, מזהה ווינרים, מייצר וריאציות

---

## שלב 0 — בדיקת חיבורים + טעינת חומרים

### KIE API (חובה)

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path.home() / ".claude"))
from master_keys import KIE_API_KEY
```

- קיים → המשך
- לא קיים → הדרך:

> **צריך מפתח KIE AI כדי לייצר תמונות:**
> 1. נכנסים ל-kie.ai ונרשמים
> 2. בפרופיל → API Keys → יוצרים מפתח
> 3. מוסיפים קרדיט בהגדרות החשבון
> 4. אומרים לקלוד קוד: "תוסיף ל-~/.claude/master_keys.py את המפתח: `KIE_API_KEY = '...'`"
>
> **עלות:** כל תמונה ~$0.03 (כ-10 אגורות)

### טעינת חומרים

- **CLAUDE.md** — חובה. קרא מהתיקייה הנוכחית.
- **avatar.md** — קרא אם קיים.
- **campaigns/brief.md** — קרא אם קיים.
- **דף נחיתה** — קרא אם קיים (HTML/DOCX).
- **campaigns/**/learnings.md** — קרא אם קיים. זוויות שנפסלו לא מוצעות שוב.
- **campaigns/**/ads.md** — קרא אם קיים. הקופי + הזוויות שנכתבו.

### תיקיית פנים (משפר תוצאות)

חפש תיקיית פנים בפרויקט:

```bash
find . -type d \( -name "*פנים*" -o -name "my-face" -o -name "face*" -o -name "*תדמית*" \) 2>/dev/null
```

**נמצאה** → שמור נתיב, בדוק שיש תמונות.

**לא נמצאה:**
> **טיפ לתוצאות טובות יותר (לא חובה):**
> צור תיקיית `my-face/` ושים בה 3-5 תמונות שלך מזוויות שונות.
> ככה המודל ייצר פנים מדויקות יותר.
>
> **של מי הפנים?** שלך או של לקוח?

אם המשתמש אומר "תמשיך בלי" → המשך, ציין בסיכום: "⚠️ נוצר בלי רפרנס פנים"

---

## שלב 1 — זיהוי מצב

**שאל:**

> "יש לך מודעות שכבר רצות בממומן?"

### אם לא → מצב "מאפס"

המשך ישר לשלב 2 (חילוץ זוויות מחומרים).

### אם כן → מצב "ווינרים"

> "מעולה! אני שולח סוכן לנתח את הקמפיין שלך ולמצוא מה עובד. זה לוקח דקה-שתיים..."

**שלח סוכן analytics ברקע (Agent tool, run_in_background):**

> "הרץ את סקיל analytics על הפרויקט הנוכחי.
> קרא את `~/.claude/skills/analytics/SKILL.md` ועבוד לפיו.
> קרא את CLAUDE.md של הפרויקט לחיבור META.
> המטרה: לזהות ווינרים (מודעות עם CPL נמוך ולפחות 3 לידים).
> החזר: טבלת מודעות עם הוצאה, לידים, CPL, וסטטוס (✅ ווינר / ❌ חבוט).
> שמור learnings.md."

**כשהסוכן חוזר:**
- קרא את learnings.md שנוצר
- זהה ווינרים (✅)
- שלוף את הקריאייטיבים של הווינרים מפייסבוק (image_url/thumbnail_url)
- הצג טבלה למשתמש:

| ווינר | הוצאה | לידים | CPL | זווית |
|-------|-------|-------|-----|-------|
| [שם] | [X] ש"ח | [X] | [X] ש"ח | [זווית] |

> "אלה הווינרים שלך. מייצר 4 וריאציות לכל אחד?"

→ המשך לשלב 3 (ייצור).

---

## שלב 2 — חילוץ זוויות מחומרים (מצב "מאפס")

### סריקת חומרים

מתוך כל מה שנטען בשלב 0, חלץ 4-5 זוויות שונות. כל זווית חייבת:

1. **שם הזווית** — שם קצר (למשל: "הכאב", "המנגנון", "ההוכחה")
2. **הקופי לקריאייטיב** — 2-3 שורות טקסט בעברית שיופיעו על התמונה
3. **מאיפה זה בא** — ציטוט מהחומר המקורי
4. **למה הזווית הזו** — הסבר קצר

**סוגי זוויות:**

| סוג | מה לחפש | דוגמה |
|-----|---------|-------|
| **כאב** | תיאורי כאב, תסכול | "7 לקוחות. שעות מטורפות. אפס שליטה." |
| **מנגנון** | איך עובד, מה ייחודי | "קלוד קוד מריץ קמפיינים. לא רק כותב קופי." |
| **תוצאה** | מספרים, הוכחות | "100 קמפיינים. 1,000 מודעות. 10 דקות." |
| **זהות** | מי הלקוח רוצה להיות | "איש אחד. סוכנות שלמה." |
| **ניגוד** | לפני/אחרי | "GPT כותב. קלוד קוד מבצע." |

**מקורות הקופי לקריאייטיבים:**
- כותרות שכבר נכתבו ואושרו (מ-headlines.md)
- הוקים מהקופי של המודעות (מ-ads.md)
- הוקים חדשים מהחומרים — **חייבים מבחן פואנטה:** מסקרן? עוצר גלילה? יש "רגע מה?"? אם לא — פסול.
- **אסור להמציא הוקים גנריים.**

### הצגה לאישור

**חובה — לא לייצר לפני אישור!**

> **זוויות לקריאייטיבים:**
>
> **1. "הכאב"** 🔴
> קופי: "7 לקוחות. שעות מטורפות. אפס שליטה."
> מקור: דף מכירה — "קמפיינר חנוק עם 7-10 לקוחות"
>
> **2. "המנגנון"** 🔧
> קופי: "קלוד קוד מריץ קמפיינים. לא רק כותב קופי."
> מקור: CLAUDE.md — "בידול מ-GPT"
>
> **איזה זוויות לייצר? (מספרים / כולם / תחליף X)**

**עצור. חכה לאישור.**

---

## שלב 3 — העלאת רפרנסים + בניית פרומפטים

### העלאת תמונות פנים ל-KIE

```python
from PIL import Image
import io, requests

face_urls = []
for face_path in face_images:
    img = Image.open(face_path)
    img.thumbnail((800, 800), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    buf.seek(0)

    r = requests.post(
        'https://kieai.redpandaai.co/api/file-stream-upload',
        headers={'Authorization': f'Bearer {KIE_API_KEY}'},
        files={'file': ('face.jpg', buf, 'image/jpeg')},
        data={'uploadPath': 'images'},
        timeout=30
    )
    face_urls.append(r.json()['data']['downloadUrl'])
```

### העלאת תמונת ווינר כרפרנס סגנון (רק במצב ווינרים)

אם יש קריאייטיב של ווינר — העלה גם אותו. שמור כל URLs ברשימה אחת.

### בניית פרומפטים

**כללי פרומפט:**
- **אנגלית** — הפרומפט תמיד באנגלית (KIE עובד טוב יותר)
- **עברית בתוך הפרומפט** — טקסט שצריך להופיע על התמונה: "Hebrew text: ..."
- **ספציפי** — לא "modern office" אלא "dark background with orange pixel-style text, 3D blocks floating, warm glow"
- **שימור פנים** — כל פרומפט עם רפרנס פנים חייב בלוק:

```
FACE PRESERVATION — CRITICAL:
This person's face MUST exactly match the reference photos provided.
Preserve: face shape, jawline, nose, eyes, eyebrows, hairline, skin tone.
Do NOT alter, beautify, age, or modify any facial features.
The person must be immediately recognizable as the same person.
```

### ייצור 4 פרומפטים לכל זווית

לכל זווית/ווינר, 4 סצנות שונות עם **אותו קופי**:

| # | סצנה | מתי |
|---|------|-----|
| 1 | Command Center — מסכים, דשבורדים | זווית שליטה/מנגנון |
| 2 | Machine/Device — INPUT→OUTPUT | זווית תוצאה/מנגנון |
| 3 | Multiplied — עותקים הולוגרפיים | זווית סקייל/גדילה |
| 4 | Cockpit — קוקפיט עתידני | זווית שליטה/חופש |

**התאם סצנות לזווית:** זווית "כאב" = סצנה חשוכה/לחוצה. זווית "תוצאה" = סצנה מרשימה.

### תבנית פרומפט

```
Professional Facebook ad creative photo, square 1:1 format. [סגנון ויזואלי].

FACE PRESERVATION — CRITICAL:
[בלוק שימור פנים]

[תיאור הסצנה]

CRITICAL - Hebrew text overlay (RIGHT TO LEFT, bold):
- Top: "[שורה 1]"
- Bottom: "[שורה 2]"

Text must be clearly readable, professional typography, right-aligned.
```

---

## שלב 4 — ייצור

**תמונה אחת בכל פעם. לא במקביל.**

```python
import sys, json, time, requests
from pathlib import Path

sys.path.insert(0, str(Path.home() / ".claude"))
from master_keys import KIE_API_KEY

headers = {
    'Authorization': f'Bearer {KIE_API_KEY}',
    'Content-Type': 'application/json'
}

def generate_image(prompt, files_urls, output_path):
    payload = {
        'prompt': prompt,
        'size': '1:1',
        'nVariants': 1
    }
    if files_urls:
        payload['filesUrl'] = files_urls

    r = requests.post(
        'https://api.kie.ai/api/v1/gpt4o-image/generate',
        headers=headers,
        json=payload,
        timeout=30
    )

    data = r.json()
    if data.get('code') != 200:
        print(f"Error: {data.get('msg', data)}")
        return False

    task_id = data['data']['taskId']

    for attempt in range(60):
        time.sleep(5)
        r2 = requests.get(
            f'https://api.kie.ai/api/v1/gpt4o-image/record-info?taskId={task_id}',
            headers={'Authorization': f'Bearer {KIE_API_KEY}'}
        )
        d = r2.json().get('data', {})

        if d.get('successFlag') == 1:
            result_url = d['response']['resultUrls'][0]
            img_data = requests.get(result_url, timeout=30).content
            with open(output_path, 'wb') as f:
                f.write(img_data)
            return True
        elif d.get('successFlag') in (2, 3):
            err = d.get('errorMessage') or d.get('errorMsg') or 'unknown'
            print(f"Failed: {err}")
            return False

    print("Timeout")
    return False
```

**עדכון תהליך:**
```
⏳ זווית "הזהות" — וריאציה 2/4...
✅ זווית "הזהות" — וריאציה 2/4 נוצרה
```

---

## שלב 5 — QA Agent (אוטומטי)

**לפני הצגה — סוכן QA בודק כל קריאייטיב.**

הפעל Agent לכל תמונה:

> "בדוק קריאייטיב למודעת פייסבוק.
> זווית: [שם]. קופי נדרש: [הקופי בעברית].
> בדוק:
> 1. טקסט עברי קריא ונכון? RTL?
> 2. סגנון ויזואלי מקצועי?
> 3. פנים תואמות לרפרנס? (אם יש)
> 4. מוכן כמודעת פייסבוק?
> VERDICT: PASS / FAIL + מה לתקן"

**לוגיקת retry:**
- PASS → שומר
- FAIL → מייצר מחדש עם פרומפט מתוקן (עד 2 retries)
- FAIL שוב → שומר + מסמן ⚠️

**מקסימום 3 ניסיונות לכל תמונה.**

---

## שלב 6 — שמירה

```python
import datetime, os
folder = f"קריאייטיבים {datetime.date.today().strftime('%d.%m.%Y')}"
os.makedirs(folder, exist_ok=True)
# העבר את כל התמונות לתיקייה
```

---

## שלב 7 — הצגה וסקירה

הצג כל תמונה מקובצת לפי זווית:

### זווית: "[שם]" — [קופי]

| # | סצנה | קובץ | QA |
|---|------|------|----|
| 1 | Command Center | [file] | ✅ |
| 2 | Machine | [file] | ✅ |
| 3 | Multiplied | [file] | ⚠️ |
| 4 | Cockpit | [file] | ✅ |

### סיכום

| זווית | נוצרו | עברו QA | ⚠️ |
|-------|-------|---------|----|
| [שם] | 4 | 3 | 1 |
| **סה"כ** | **X** | **X** | **X** |

**מה הלאה?**
> 1. וריאציות נוספות לזווית ספציפית
> 2. זוויות חדשות
> 3. אותן תמונות בגדלים נוספים (סטורי/פיד רחב)
> 4. להעלות לקמפיין (`/facebook-campaign`)
> 5. מעולה, סיימנו

---

## כללים

1. **4 וריאציות לכל זווית/ווינר** — 2 ווינרים = 8 קריאייטיבים, 3 זוויות = 12
2. **עברית תמיד** — כל תקשורת עם המשתמש. פרומפט ל-KIE באנגלית
3. **לא להמציא זוויות** — רק מחומרים קיימים
4. **אישור לפני ייצור** — להציג זוויות/ווינרים ולחכות
5. **קופי על הקריאייטיב חובה** — כל תמונה חייבת טקסט שיווקי
6. **כותרות בלי סימני פיסוק** — אסור מקפים (— / –), נקודות (.), נקודה-פסיק (;). נקודתיים מותר
7. **שימור פנים** — אם יש תיקיית פנים, תמיד להשתמש
8. **לא במקביל** — תמונה אחת בכל פעם
9. **עלויות** — להזכיר: "מייצר X תמונות (~$Y)"
10. **לנקות** — למחוק סקריפטים זמניים אחרי הרצה. **לעולם לא למחוק קריאייטיבים בלי אישור**
11. **v22.0** — כל קריאה ל-Facebook Graph API
12. **ACCESS_TOKEN בלבד מ-fb_config.py** — כל השאר (AD_ACCOUNT_ID, PAGE_ID) מ-CLAUDE.md