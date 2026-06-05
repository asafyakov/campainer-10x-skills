---
name: competitor-research
description: מחקר שוק ומתחרים. מוצא מתחרים, שולף מודעות פעילות דרך Apify, מוריד קריאייטיבים (תמונות + וידאו), קורא דפי נחיתה, מנתח זוויות/קריאייטיבים/הצעות, ומוצא פערים והזדמנויות. אופציה לתמלול וידאו דרך Replicate.
argument-hint: "[תחום / שמות מתחרים / URL דף פייסבוק]"
allowed-tools: Read, Write, Bash, Glob, Grep, WebSearch, WebFetch
---

# Competitor Research — מחקר שוק ומתחרים

## מה הסקיל עושה

מוצא מתחרים, שולף את כל המודעות הפעילות שלהם, מוריד קריאייטיבים (תמונות + וידאו), קורא את דפי הנחיתה שלהם, ומייצר דוח מחקר עם פערים והזדמנויות. הפלט מזין את `/campaign-brief`.

**סקיל חד-פעמי** — מריצים בתחילת פרויקט או כשנכנסים ללקוח חדש.

---

## שלב 0 — טעינת חומרים + בדיקת חיבור

### טעינת חומרים
- **CLAUDE.md** — קרא מהתיקייה הנוכחית. אם אין — בקש מהמשתמש רקע על העסק.
- **avatar.md** — קרא אם קיים. חשוב להבין את הקהל לפני שמנתחים מתחרים.
- **דף נחיתה** — אם יש דף נחיתה של הלקוח (HTML/DOCX) — קרא אותו. ישמש להשוואה בשלב 5.

### בדיקת חיבור Apify

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path.home() / ".claude"))
from master_keys import APIFY_API_TOKEN
```

- קיים → המשך
- לא קיים → הדרך את המשתמש:

> **צריך מפתח Apify כדי לשלוף מודעות מתחרים:**
> 1. נכנסים ל-apify.com ונרשמים (חינם, אפשר עם גוגל)
> 2. נכנסים ל-Settings → Integrations → API tokens
> 3. לוחצים "Create token" ומעתיקים
> 4. אומרים לקלוד קוד: "תוסיף ל-~/.claude/master_keys.py את המפתח: `APIFY_API_TOKEN = 'apify_api_...'`"
> 4. שולחים לי ואני שומר ב-fb_config.py
>
> **עלות:** יש קרדיט חינמי לחשבון חדש. אחרי זה — כ-$5 לחודש למשתמש ממוצע. סריקה של מתחרה אחד = כמה סנט.

---

## שלב 1 — מציאת מתחרים

**קודם שאל:**
> "מי המתחרים שלך? תן לי:
> — שמות עסקים / מותגים
> — לינקים לדפי פייסבוק (אם יש)
> — או פשוט תאר את התחום ואני אמצא"

**בכל מקרה — גם אם המשתמש נתן שמות — חפש עוד:**

1. **חיפוש בגוגל:**
   - `"[תחום]" site:facebook.com/ads/library Israel`
   - `"[תחום]" קורס/סדנה/ליווי ישראל`
   - `"[תחום]" מודעות פייסבוק ישראל`

2. **חיפוש בספריית המודעות של פייסבוק דרך Apify:**
   - הרץ חיפוש עם מילות מפתח רלוונטיות לתחום

3. **הצג רשימה מאוחדת למשתמש:**
> "מצאתי את המתחרים האלה: [רשימה]. נכון? חסר מישהו? רוצה להוסיף/להוריד?"

**עצור. חכה לאישור.**

---

## שלב 2 — שליפת מודעות (Apify)

**Actor:** `curious_coder/facebook-ads-library-scraper`

לכל מתחרה, הרץ:

```python
import requests, json, time
from pathlib import Path
import sys
sys.path.insert(0, str(Path.home() / ".claude"))
from fb_config import APIFY_API_TOKEN

def scrape_competitor_ads(search_term_or_page_url, max_ads=20):
    """שולף מודעות פעילות של מתחרה מספריית המודעות."""
    
    # Build ad library URL
    if "facebook.com" in search_term_or_page_url:
        url = search_term_or_page_url
    else:
        # Search by term
        from urllib.parse import quote
        url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IL&q={quote(search_term_or_page_url)}"
    
    r = requests.post(
        "https://api.apify.com/v2/acts/curious_coder~facebook-ads-library-scraper/runs",
        params={"token": APIFY_API_TOKEN},
        json={
            "urls": [{"url": url}],
            "resultsLimit": max_ads
        },
        timeout=30
    )
    run_id = r.json()["data"]["id"]
    
    # Wait for completion
    for i in range(40):
        time.sleep(5)
        r2 = requests.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}",
            params={"token": APIFY_API_TOKEN}
        )
        status = r2.json()["data"]["status"]
        if status in ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]:
            break
    
    if status == "SUCCEEDED":
        r3 = requests.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
            params={"token": APIFY_API_TOKEN}
        )
        return r3.json()
    return []
```

**לכל מודעה חלץ:**
- `snapshot.body.text` — טקסט הקופי המלא
- `snapshot.title` — כותרת
- `snapshot.cta_text` — CTA
- `snapshot.link_url` — לינק לדף נחיתה
- `snapshot.images[].original_image_url` — קריאייטיב תמונה
- `snapshot.videos[].video_sd_url` / `video_hd_url` — קריאייטיב וידאו
- `snapshot.videos[].video_preview_image_url` — thumbnail של הוידאו
- `snapshot.display_format` — IMAGE / VIDEO
- `start_date_formatted` — תאריך התחלה (לזיהוי ווינרים)
- `collation_count` — מספר וריאציות

---

## שלב 3 — זיהוי ווינרים + הורדת קריאייטיבים

### זיהוי ווינרים
**מודעה שרצה 30+ יום = כנראה ווינר.**

חשב את מספר הימים שכל מודעה רצה (מ-start_date עד היום).
סדר לפי הכי ארוך → הכי קצר.

**סימנים לווינר:**
- רצה 30+ יום ועדיין פעילה
- יש לה כמה וריאציות (collation_count > 1)
- אותו דף מריץ כמה מודעות עם אותה זווית

### הורדת קריאייטיבים (אוטומטי)

צור תיקיית `competitor-creatives/` עם תת-תיקייה לכל מתחרה:

```
competitor-creatives/
├── [שם-מתחרה-1]/
│   ├── ads-copy.md              ← כל הקופי של המודעות שלו
│   ├── ad-01-image.jpg          ← תמונת קריאייטיב
│   ├── ad-02-video.mp4          ← וידאו קריאייטיב
│   ├── ad-02-thumbnail.jpg      ← תמונת תצוגה מהוידאו
│   └── ad-02-transcript.md      ← תמלול (אופציונלי)
├── [שם-מתחרה-2]/
│   └── ...
```

**קובץ ads-copy.md לכל מתחרה:**

```markdown
# מודעות [שם מתחרה] — [תאריך סריקה]

## מודעה 1 (ווינר — רץ X ימים)
**כותרת:** [title]
**CTA:** [cta_text]
**לינק:** [link_url]
**קריאייטיב:** ad-01-image.jpg

**קופי:**
[body.text מלא]

---

## מודעה 2
...
```

```python
import requests, os

def download_creatives(ads, competitor_name, base_dir="competitor-creatives"):
    """מוריד קריאייטיבים של מתחרה לתיקייה."""
    # Sanitize folder name
    safe_name = competitor_name.replace(" ", "-").replace("/", "-")
    folder = os.path.join(base_dir, safe_name)
    os.makedirs(folder, exist_ok=True)
    
    copy_lines = [f"# מודעות {competitor_name}\n"]
    
    for i, ad in enumerate(ads):
        snap = ad.get("snapshot", {})
        body = snap.get("body", {}).get("text", "")
        title = snap.get("title", "N/A")
        cta = snap.get("cta_text", "N/A")
        link = snap.get("link_url", "N/A")
        start = ad.get("start_date_formatted", "N/A")
        images = snap.get("images", [])
        videos = snap.get("videos", [])
        
        # Download images
        if images:
            img_url = images[0].get("original_image_url") or images[0].get("resized_image_url")
            if img_url:
                try:
                    r = requests.get(img_url, timeout=15)
                    if r.status_code == 200 and len(r.content) > 1000:
                        fname = f"ad-{i+1:02d}-image.jpg"
                        with open(os.path.join(folder, fname), "wb") as f:
                            f.write(r.content)
                except: pass
        
        # Download videos + thumbnails
        if videos:
            vid = videos[0]
            # Thumbnail
            thumb_url = vid.get("video_preview_image_url")
            if thumb_url:
                try:
                    r = requests.get(thumb_url, timeout=15)
                    if r.status_code == 200:
                        with open(os.path.join(folder, f"ad-{i+1:02d}-thumbnail.jpg"), "wb") as f:
                            f.write(r.content)
                except: pass
            
            # Video
            vid_url = vid.get("video_sd_url") or vid.get("video_hd_url")
            if vid_url:
                try:
                    r = requests.get(vid_url, timeout=60, stream=True)
                    if r.status_code == 200:
                        with open(os.path.join(folder, f"ad-{i+1:02d}-video.mp4"), "wb") as f:
                            for chunk in r.iter_content(chunk_size=8192):
                                f.write(chunk)
                except: pass
        
        # Build copy document
        copy_lines.append(f"\n## מודעה {i+1} (התחלה: {start})")
        copy_lines.append(f"**כותרת:** {title}")
        copy_lines.append(f"**CTA:** {cta}")
        copy_lines.append(f"**לינק:** {link}")
        copy_lines.append(f"\n**קופי:**\n{body}\n")
        copy_lines.append("---\n")
    
    # Save copy document
    with open(os.path.join(folder, "ads-copy.md"), "w") as f:
        f.write("\n".join(copy_lines))
    
    return folder
```

---

## שלב 3B — תמלול וידאו (אופציונלי)

אחרי הורדת הקריאייטיבים, שאל:

> "הורדתי X סרטוני וידאו של מתחרים. רוצה שאני אתמלל אותם כדי שנוכל ללמוד מהזוויות שעובדות להם?
> 
> זה דורש חיבור ל-Replicate (חינמי כמעט — כ-3 שקלים ל-100 דקות וידאו). אם כן — אדריך אותך."

**אם המשתמש עונה כן:**

> **איך מתחברים ל-Replicate (חד-פעמי):**
> 1. נכנסים ל-replicate.com ונרשמים (חינם, אפשר עם גוגל/גיטהאב)
> 2. נכנסים ל-Account Settings → API tokens
> 3. לוחצים "Create token" ומעתיקים
> 4. שולחים לי ואני שומר
>
> **מה קורה מאחורי הקלעים:**
> - הסרטון נשלח לשרתים של Replicate (לא רץ על המחשב שלך)
> - מודל Whisper של OpenAI מתמלל את השמע — כולל עברית
> - התמלול חוזר כטקסט ונשמר לצד הסרטון
> - עלות: פחות מאגורה למודעה ממוצעת (30-90 שניות)

```python
import replicate

def transcribe_video(video_path):
    """מתמלל וידאו דרך Replicate Whisper."""
    output = replicate.run(
        "openai/whisper:cdd97b257f93cb89dede1c7584df3920f8b02b90702d2a04f1e229d7508e5f99",
        input={
            "audio": open(video_path, "rb"),
            "model": "large-v3",
            "language": "he",
            "translate": False
        }
    )
    return output.get("transcription", "")
```

שמור תמלולים ב-`ad-XX-transcript.md` בתיקיית המתחרה.

**אם המשתמש עונה לא — ממשיך בלי תמלול.**

---

## שלב 4 — קריאת דפי נחיתה

לכל לינק ייחודי שנמצא במודעות:

```python
# WebFetch על כל דף נחיתה
```

חלץ:
- **כותרת ראשית** — מה ההבטחה
- **מנגנון** — למה זה עובד אחרת
- **הצעה** — מה כלול, מה המחיר, מה האחריות
- **הוכחות** — תוצאות, קייסים, מספרים
- **CTA** — מה הפעולה

---

## שלב 5 — ניתוח דפוסים

עבור על כל המודעות שנשלפו ונתח:

**זוויות:**
- על מה כל מודעה מדברת? כאב? הבטחה? מנגנון? סיפור?
- איזה זוויות חוזרות אצל כמה מתחרים?

**הוקים:**
- איך פותחים? שאלה? הצהרה? מספר? ניפוץ אמונה?
- מה הטון — אגרסיבי? רך? דיבורי? סמכותי?

**קריאייטיבים:**
- תמונות / וידאו / מיקס?
- סגנון עיצובי — צילומי? גרפי? טקסט על רקע? UGC?
- צבעים דומיננטיים

**CTAs:**
- לאן שולחים? דף נחיתה? וובינר? טופס? וואטסאפ?
- מה הפעולה המבוקשת?

**שפה:**
- פורמלי / דיבורי / אגרסיבי / רך
- ארוך / קצר / בינוני

**השוואה לדף הנחיתה שלנו (אם קיים):**
- מה אנחנו אומרים שהם לא?
- מה הם אומרים שאנחנו לא?
- איפה הבידול שלנו הכי חזק?

---

## שלב 6 — מציאת פערים

זה התוצאה הכי חשובה:

- **מה כולם אומרים** → שחוק, לא לעשות
- **מה אף אחד לא אומר** → הזדמנות לבידול
- **מה אחד אומר ונראה שעובד לו** (ווינר) → שווה לבדוק
- **איזה סוג קריאייטיב חסר בשוק** → הזדמנות ויזואלית
- **איזה קהל אף אחד לא פונה אליו** → הזדמנות טירגוט

---

## שלב 7 — שמירת הדוח + סיכום

שמור כ-`competitor-research.md` בתיקיית הפרויקט:

```markdown
# מחקר שוק ומתחרים — [תחום]

> תאריך סריקה: [תאריך]
> מתחרים: [מספר] | מודעות: [מספר] | ווינרים: [מספר]

## מתחרים שנחקרו
| מתחרה | דף פייסבוק | מודעות פעילות | ווינרים (30+ יום) | תיקיית קריאייטיבים |
|--------|-----------|---------------|-------------------|-------------------|
| [שם] | [URL] | X | Y | competitor-creatives/[שם]/ |

## ווינרים — מודעות שרצות הכי הרבה זמן
1. **[מתחרה]** — [זווית] — [הוק ראשון] — רץ X ימים
2. ...

## זוויות שחוזרות בשוק
1. **[זווית]** — X מתחרים משתמשים — [דוגמה]
2. ...

## סגנון קריאייטיב נפוץ
- [תמונה/וידאו/UGC, מה נראה, צבעים]

## דפי נחיתה — הבטחות מרכזיות
| מתחרה | הבטחה | מנגנון | CTA |
|--------|--------|--------|-----|
| [שם] | [מה מבטיח] | [מה שונה] | [מה הפעולה] |

## פערים והזדמנויות
1. **[מה אף אחד לא אומר]** — למה זו הזדמנות
2. **[סוג קריאייטיב שחסר]** — למה כדאי לנסות
3. **[קהל שאף אחד לא פונה אליו]** — למה רלוונטי

## קריאייטיבים שהורדו
כל הקריאייטיבים נמצאים בתיקיית `competitor-creatives/`:
- [שם מתחרה 1]: X תמונות, Y וידאו — `competitor-creatives/[שם]/`
- [שם מתחרה 2]: ...
```

הצג סיכום קצר למשתמש:

> **סיכום מחקר מתחרים:**
> — נחקרו X מתחרים, נמצאו Y מודעות פעילות
> — Z ווינרים (רצים 30+ יום)
> — הורדו N קריאייטיבים לתיקיית competitor-creatives/
> — הזוויות הנפוצות: [רשימה]
> — הפערים שמצאתי: [רשימה]
>
> הדוח המלא: `competitor-research.md`
> קריאייטיבים: `competitor-creatives/`
>
> רוצה להמשיך ל-`/campaign-brief`?

---

## כללים

1. **Apify Actor:** `curious_coder/facebook-ads-library-scraper` — לא `apify~facebook-ads-scraper` (ישן)
2. **פורמט קלט:** `{"urls": [{"url": "..."}], "resultsLimit": N}`
3. **לא להמציא דאטה** — אם Apify מחזיר ריק, לדווח למשתמש ולהציע אלטרנטיבה
4. **ווינר = זמן ריצה** — זמן ריצה הוא הפרוקסי הטוב ביותר להצלחה
5. **מקסימום 20 מודעות למתחרה** — חוסך קרדיטים, מספיק לניתוח
6. **הורדת קריאייטיבים אוטומטית** — תמונות + וידאו + thumbnails
7. **תמלול אופציונלי** — רק אם המשתמש מאשר + יש חיבור Replicate
8. **הדוח מזין את campaign-brief** — לוודא שפערים והזדמנויות נכנסים לבריף
9. **עברית בלבד** — כל הדוחות והפלט בעברית
