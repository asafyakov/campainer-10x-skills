---
name: competitor-research
description: מחקר שוק ומתחרים מקיף — 4 ערוצים במקביל. סורק ספריית מודעות (תקציב), אינסטגרם (עוקבים), פייסבוק אורגני (עוקבים), ממזג לרשימת מובילים, ואז מעמיק על כל מתחרה דרך גוגל + דף נחיתה. מוריד קריאייטיבים, מנתח זוויות ופערים, מכין בריף לקמפיין.
argument-hint: "[תחום / נישה]"
allowed-tools: Read, Write, Bash, Glob, Grep, WebSearch, WebFetch
---

# Competitor Research — מחקר שוק ומתחרים

## מה הסקיל עושה

סורק 4 ערוצים לזיהוי המתחרים המובילים בנישה, ממזג לרשימה מדורגת, ואז מעמיק על כל אחד — מודעות, תוכן אורגני, אינסטגרם, אתר ודף נחיתה. הפלט מזין את `/campaign-brief`.

**זמן ריצה משוער: 25–45 דקות** (תלוי בכמות מתחרים ובמהירות Apify)
**עלות Apify: ~$0.10–$0.50** לסריקה מלאה של 5 מתחרים (6 actor runs)
**עלות Replicate (אופציונלי): כמה אגורות לסרטון** (Whisper large-v3)

**סדר הערוצים:**
1. ספריית מודעות — מי מוציא הכי הרבה כסף
2. אינסטגרם — מי הכי גדול בעוקבים
3. פייסבוק אורגני — מי הכי גדול בעוקבים
4. מיזוג → רשימה מדורגת
5. גוגל — העמקה על כל מתחרה שזוהה (אתר + דף נחיתה)

---

## שלב 0 — בדיקות סביבה + הכנה

### בדיקה 1 — Python

```bash
python3 --version 2>/dev/null || python --version 2>/dev/null
```

- עובד → קבע את הפקודה (`python3` או `python`) לשימוש בכל הקוד הבא
- לא עובד → עצור והדרך:

> **Python לא מותקן. צריך להתקין לפני שממשיכים:**
>
> **Mac:**
> 1. פתח Terminal
> 2. הרץ: `brew install python3`
> 3. אם אין Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
>
> **Windows:**
> 1. כנס ל-python.org/downloads
> 2. הורד Python 3.11+
> 3. בהתקנה — סמן ✅ "Add Python to PATH"
> 4. פתח Terminal חדש ובדוק: `python --version`
>
> אחרי ההתקנה — הפעל שוב את הסקיל.

---

### בדיקה 2 — Apify token

```bash
python3 -c "
import sys
from pathlib import Path
mk = Path.home() / '.claude' / 'master_keys.py'
if not mk.exists():
    print('NO_FILE')
else:
    sys.path.insert(0, str(mk.parent))
    try:
        from master_keys import APIFY_API_TOKEN
        print('OK')
    except ImportError:
        print('NO_TOKEN')
"
```

- `OK` → המשך
- `NO_FILE` או `NO_TOKEN` → בקש מהמשתמש:

> **חסר Apify token.**
> 1. נכנסים ל-apify.com → נרשמים (חינם)
> 2. Settings → Integrations → API tokens → Create token
> 3. תשלח לי את ה-token ואני אוסיף לקובץ

כשמתקבל — הוסף לקובץ `~/.claude/master_keys.py`:

```python
from pathlib import Path
token = "apify_api_..."  # token מהמשתמש
mk = Path.home() / ".claude" / "master_keys.py"
# הוסף שורה לסוף הקובץ הקיים (או צור חדש)
with open(mk, "a") as f:
    f.write(f'\nAPIFY_API_TOKEN = "{token}"\n')
print("✅ נשמר")
```

---

### פתיחת תיקיית עבודה

**תמיד** פתח תיקיית `competitor-research/` בתוך תיקיית הפרויקט הנוכחית (CWD).
בתוכה — תת-תיקייה לכל מתחרה: `competitor-research/[שם-מתחרה]/`

```python
import os

def setup_research_dir(competitor_name, base="competitor-research"):
    safe = competitor_name.replace(" ", "-").replace("/", "-").strip("-")
    path = os.path.join(base, safe)
    os.makedirs(path, exist_ok=True)
    return path
```

**מבנה קבצים לכל מתחרה:**
```
competitor-research/
└── [שם-מתחרה]/
    ├── profile.md          ← ביו, עוקבים, קישורים
    ├── ads-copy.md         ← כל קופי המודעות + הוקים
    ├── organic-posts.md    ← פוסטים אורגניים (FB + IG)
    ├── reels-analysis.md   ← ניתוח Reels (קאפשנים + stats)
    ├── landing-page.md     ← ניתוח דף נחיתה
    ├── ad-01-image.jpg     ← קריאייטיב תמונה
    ├── ad-02-thumbnail.jpg ← thumbnail של וידאו
    └── ad-02-video.mp4     ← קריאייטיב וידאו
```

---

### טעינת חומרים
- **CLAUDE.md** — קרא מהתיקייה הנוכחית. אם אין — בקש מהמשתמש רקע על העסק.
- **avatar.md** — קרא אם קיים. חשוב להבין את הקהל לפני שמנתחים מתחרים.
- **דף נחיתה** — אם יש דף נחיתה של הלקוח (HTML/DOCX) — קרא אותו. ישמש להשוואה בשלב הניתוח.

### קבלת התחום מהמשתמש

אם לא הועבר כארגומנט — שאל:
> "באיזה תחום/נישה לחפש מתחרים? (לדוגמה: קורסי קמפיינרים, ליווי עסקי, פיטנס לגברים)"

---

## שלב 1 — ספריית מודעות (מי מוציא הכי הרבה כסף)

**Actor:** `curious_coder/facebook-ads-library-scraper`

```python
import requests, json, time
from pathlib import Path
import sys
sys.path.insert(0, str(Path.home() / ".claude"))
from master_keys import APIFY_API_TOKEN

def wait_for_run(run_id, max_polls=40, poll_interval=5):
    """ממתין לסיום Apify run. מחזיר status סופי."""
    status = "RUNNING"
    for _ in range(max_polls):
        time.sleep(poll_interval)
        resp = requests.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}",
            params={"token": APIFY_API_TOKEN},
            timeout=15
        )
        resp.raise_for_status()
        status = resp.json()["data"]["status"]
        if status in ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]:
            break
    return status

def get_run_items(run_id):
    """שולף תוצאות מ-Apify dataset."""
    r = requests.get(
        f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
        params={"token": APIFY_API_TOKEN},
        timeout=30
    )
    r.raise_for_status()
    return r.json()

def scrape_ads_library(search_term, max_ads=50):
    """שולף מודעות פעילות מספריית המודעות לפי תחום."""
    from urllib.parse import quote
    url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IL&q={quote(search_term)}"
    
    r = requests.post(
        "https://api.apify.com/v2/acts/curious_coder~facebook-ads-library-scraper/runs",
        params={"token": APIFY_API_TOKEN},
        json={"urls": [{"url": url}], "resultsLimit": max_ads},
        timeout=30
    )
    r.raise_for_status()
    run_id = r.json()["data"]["id"]
    
    status = wait_for_run(run_id)
    if status == "SUCCEEDED":
        return get_run_items(run_id)
    print(f"⚠️ scrape_ads_library סיים עם status: {status}")
    return []
```

**דירוג מפרסמים לפי תקציב משוער:**

```python
from collections import defaultdict
from datetime import datetime

def rank_advertisers_by_budget(ads):
    """מדרג מפרסמים לפי: כמות מודעות × וריאציות × זמן ריצה."""
    advertisers = defaultdict(lambda: {"ads": [], "score": 0, "page_name": "", "page_id": ""})
    
    for ad in ads:
        page_id = ad.get("page_id", "")
        page_name = ad.get("page_name", "")
        if not page_id:
            continue
        
        # חשב ימי ריצה — calc_days מוגדרת בשלב 6, לשים כאן inline
        ts = ad.get("start_date")
        try:
            days_running = (datetime.now() - datetime.fromtimestamp(int(ts))).days if ts else 1
        except Exception:
            try:
                days_running = (datetime.now() - datetime.strptime(ad.get("start_date_formatted",""), "%Y-%m-%d")).days
            except Exception:
                days_running = 1
        
        collation = ad.get("collation_count", 1) or 1
        score = days_running * collation  # proxy לתקציב
        
        advertisers[page_id]["page_name"] = page_name
        advertisers[page_id]["page_id"] = page_id
        advertisers[page_id]["ads"].append(ad)
        advertisers[page_id]["score"] += score
    
    ranked = sorted(advertisers.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:10]  # top 10
```

שמור רשימה: `ads_library_competitors = [{"name": ..., "score": ..., "ad_count": ...}]`

---

## שלב 2 — אינסטגרם (מי הכי גדול בעוקבים)

**Actor:** `apify~instagram-profile-scraper`

**שלב 2א — מציאת usernames:**

חפש דרך WebSearch:
```
"[תחום]" site:instagram.com Israel
"[תחום]" ישראל instagram
```

חלץ usernames מהתוצאות (לדוגמה: `instagram.com/username`).
יעד: 10–20 candidates.

**שלב 2ב — שליפת פרופילים:**

```python
def scrape_instagram_profiles(usernames):
    """שולף נתוני פרופיל אינסטגרם."""
    r = requests.post(
        "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs",
        params={"token": APIFY_API_TOKEN},
        json={
            "usernames": usernames,
            "resultsType": "details"
        },
        timeout=30
    )
    r.raise_for_status()
    run_id = r.json()["data"]["id"]
    
    status = wait_for_run(run_id)
    if status == "SUCCEEDED":
        return get_run_items(run_id)
    print(f"⚠️ scrape_instagram_profiles סיים עם status: {status}")
    return []
```

**מה לחלץ מכל פרופיל:**
- `username`, `fullName` — זיהוי
- `followersCount` — קריטריון מיון
- `biography` — ביו (מה הם מציעים)
- `externalUrl` — קישור לאתר/דף נחיתה
- `postsCount`, `igtvVideoCount`

**דירוג:** מיין לפי `followersCount` — גדול לקטן.

שמור: `instagram_competitors = [{"username": ..., "followers": ..., "bio": ..., "url": ...}]`

**שלב 2ג — שליפת Reels מהמובילים (top 5):**

```python
def scrape_instagram_reels(profile_urls, max_reels=10):
    """שולף Reels מפרופילים מובילים."""
    r = requests.post(
        "https://api.apify.com/v2/acts/apify~instagram-reel-scraper/runs",
        params={"token": APIFY_API_TOKEN},
        json={
            "directUrls": profile_urls,
            "resultsLimit": max_reels,
            "addVideoUrls": True
        },
        timeout=30
    )
    r.raise_for_status()
    run_id = r.json()["data"]["id"]
    
    status = wait_for_run(run_id, max_polls=60)
    if status == "SUCCEEDED":
        return get_run_items(run_id)
    print(f"⚠️ scrape_instagram_reels סיים עם status: {status}")
    return []
```

**מה לחלץ מכל Reel:**
- `caption` — קאפשן מלא (זווית, הוק, CTA)
- `videoUrl` — להורדה
- `likesCount`, `commentsCount`, `viewsCount` — engagement
- `timestamp` — תאריך פרסום

---

## שלב 3 — פייסבוק אורגני (מי הכי גדול בעוקבים)

**שלב 3א — מציאת דפים:**

חפש דרך WebSearch:
```
"[תחום]" site:facebook.com Israel
"[תחום]" ישראל פייסבוק דף
```

חלץ URLs של דפי פייסבוק.

**שלב 3ב — שליפת נתוני דפים:**

**Actor:** `apify~facebook-pages-scraper`

```python
def scrape_facebook_pages(page_urls):
    """שולף נתוני דפי פייסבוק."""
    r = requests.post(
        "https://api.apify.com/v2/acts/apify~facebook-pages-scraper/runs",
        params={"token": APIFY_API_TOKEN},
        json={"startUrls": [{"url": u} for u in page_urls]},
        timeout=30
    )
    r.raise_for_status()
    run_id = r.json()["data"]["id"]
    
    status = wait_for_run(run_id)
    if status == "SUCCEEDED":
        return get_run_items(run_id)
    print(f"⚠️ scrape_facebook_pages סיים עם status: {status}")
    return []
```

**מה לחלץ:**
- `title` — שם הדף
- `likes`, `followers` — גודל
- `website` — אתר רשמי
- `description` — תיאור הדף

**שלב 3ג — שליפת פוסטים מהמובילים (top 5):**

**Actor:** `apify~facebook-posts-scraper`

```python
def scrape_facebook_posts(page_urls, max_posts=15):
    """שולף פוסטים אורגניים מדפי פייסבוק."""
    r = requests.post(
        "https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs",
        params={"token": APIFY_API_TOKEN},
        json={
            "startUrls": [{"url": u} for u in page_urls],
            "resultsLimit": max_posts
        },
        timeout=30
    )
    r.raise_for_status()
    run_id = r.json()["data"]["id"]
    
    status = wait_for_run(run_id)
    if status == "SUCCEEDED":
        return get_run_items(run_id)
    print(f"⚠️ scrape_facebook_posts סיים עם status: {status}")
    return []
```

**מה לחלץ מכל פוסט:**
- `text` — תוכן מלא
- `likes`, `comments`, `shares` — engagement
- `time` — תאריך
- `type` — photo/video/text

---

## שלב 4 — מיזוג ודירוג סופי

**מטרה:** לזהות מי המתחרים המובילים האמיתיים — מי שמופיע בכמה ערוצים.

```python
def merge_competitors(ads_library, instagram, facebook):
    """
    ממזג 3 רשימות לדירוג אחד.
    ניקוד: הופעה בכל ערוץ = נקודה. ערוץ מודעות שווה x2 (כסף = כוונה).
    """
    scores = {}  # key = שם מנורמל
    
    for c in ads_library:
        name = normalize_name(c["page_name"])
        scores.setdefault(name, {"name": c["page_name"], "score": 0, "channels": [], "data": {}})
        scores[name]["score"] += 2  # x2 כי הוציאו כסף
        scores[name]["channels"].append("ads_library")
        scores[name]["data"]["ads"] = c
    
    for c in instagram:
        name = normalize_name(c["fullName"] or c["username"])
        scores.setdefault(name, {"name": c["fullName"], "score": 0, "channels": [], "data": {}})
        scores[name]["score"] += 1
        scores[name]["channels"].append("instagram")
        scores[name]["data"]["instagram"] = c
    
    for c in facebook:
        name = normalize_name(c["title"])
        scores.setdefault(name, {"name": c["title"], "score": 0, "channels": [], "data": {}})
        scores[name]["score"] += 1
        scores[name]["channels"].append("facebook")
        scores[name]["data"]["facebook"] = c
    
    ranked = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:10]

def normalize_name(name):
    """מנרמל שמות להשוואה — עובד עם עברית ואנגלית כאחד."""
    if not name:
        return ""
    import re
    # הסר סימני פיסוק ורווחים כפולים, שמור רק אותיות ומספרים
    name = re.sub(r"[^\w\s]", "", name, flags=re.UNICODE)
    name = re.sub(r"\s+", " ", name)
    return name.strip().lower()
```

**הצג למשתמש ואשר:**

> **מצאתי את המתחרים המובילים בתחום:**
>
> | # | שם | ערוצים | ניקוד |
> |---|----|---------|----|
> | 1 | [שם] | מודעות + אינסטגרם + פייסבוק | 4 |
> | 2 | [שם] | מודעות + אינסטגרם | 3 |
> | 3 | [שם] | אינסטגרם | 1 |
>
> **עצור. חכה לאישור.** "נכון? רוצה להוסיף/להוריד מישהו?"

---

## שלב 5 — גוגל (העמקה על המובילים)

**לכל מתחרה שאושר — חפש:**

```
"[שם מתחרה]" אתר רשמי
"[שם מתחרה]" דף נחיתה קורס/סדנה/ליווי
```

**WebFetch על כל אתר/דף נחיתה שנמצא.**

**חלץ:**
- **כותרת ראשית** — מה ההבטחה
- **מנגנון** — למה זה עובד אחרת
- **הצעה** — מה כלול, מחיר (אם גלוי), אחריות
- **הוכחות** — תוצאות, קייסים, מספרים
- **CTA** — מה הפעולה המבוקשת
- **קהל** — למי פונים

---

## שלב 6 — שליפת מודעות ומורדת קריאייטיבים (המובילים)

לכל מתחרה מאושר — שלוף מודעות ספציפיות שלו מספריית המודעות:

```python
def scrape_competitor_ads(page_url, max_ads=20):
    """שולף מודעות ספציפיות של מתחרה מספריית המודעות."""
    r = requests.post(
        "https://api.apify.com/v2/acts/curious_coder~facebook-ads-library-scraper/runs",
        params={"token": APIFY_API_TOKEN},
        json={"urls": [{"url": page_url}], "resultsLimit": max_ads},
        timeout=30
    )
    r.raise_for_status()
    run_id = r.json()["data"]["id"]
    
    status = wait_for_run(run_id)
    if status == "SUCCEEDED":
        return get_run_items(run_id)
    print(f"⚠️ scrape_competitor_ads סיים עם status: {status}")
    return []
```

**פלטור לפי דף מתחרה:**
מהתוצאות — קח רק מודעות שה-`page_name` שלהן תואם את שם המתחרה. הסריקה לפי מילת מפתח מחזירה מודעות של דפים אחרים — לסנן אותן.

**חישוב ימי ריצה — חובה:**
```python
from datetime import datetime

def calc_days(ad):
    # נסה start_date (Unix timestamp) קודם
    ts = ad.get("start_date")
    if ts:
        try:
            return (datetime.now() - datetime.fromtimestamp(int(ts))).days
        except: pass
    # fallback ל-start_date_formatted
    s = ad.get("start_date_formatted", "")
    try:
        return (datetime.now() - datetime.strptime(s, "%Y-%m-%d")).days
    except:
        return 0
```

**זיהוי ווינרים:** מודעה שרצה 30+ יום = ווינר.

**הורדת קריאייטיבים:**

```
competitor-research/
├── [שם-מתחרה]/
│   ├── profile.md          ← ביו, עוקבים, קישורים
│   ├── ads-copy.md         ← כל קופי המודעות
│   ├── organic-posts.md    ← פוסטים אורגניים (FB + IG)
│   ├── reels-analysis.md   ← ניתוח Reels
│   ├── landing-page.md     ← ניתוח דף נחיתה
│   ├── ad-01-image.jpg
│   ├── ad-02-video.mp4
│   └── ad-02-thumbnail.jpg
```

```python
def download_creatives(ads, competitor_name, base_dir="competitor-research"):
    import os
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
        
        # חשב ימי ריצה — משתמש ב-calc_days שתומכת ב-Unix timestamp ובתאריך כאחד
        days = calc_days(ad)
        winner_tag = " 🏆 ווינר" if days >= 30 else ""
        
        # תמונות
        if images:
            img_url = images[0].get("original_image_url") or images[0].get("resized_image_url")
            if img_url:
                try:
                    r = requests.get(img_url, timeout=15)
                    if r.status_code == 200 and len(r.content) > 1000:
                        with open(os.path.join(folder, f"ad-{i+1:02d}-image.jpg"), "wb") as f:
                            f.write(r.content)
                except: pass
        
        # וידאו + thumbnail
        if videos:
            vid = videos[0]
            thumb_url = vid.get("video_preview_image_url")
            if thumb_url:
                try:
                    r = requests.get(thumb_url, timeout=15)
                    if r.status_code == 200:
                        with open(os.path.join(folder, f"ad-{i+1:02d}-thumbnail.jpg"), "wb") as f:
                            f.write(r.content)
                except: pass
            
            vid_url = vid.get("video_sd_url") or vid.get("video_hd_url")
            if vid_url:
                try:
                    r = requests.get(vid_url, timeout=60, stream=True)
                    if r.status_code == 200:
                        with open(os.path.join(folder, f"ad-{i+1:02d}-video.mp4"), "wb") as f:
                            for chunk in r.iter_content(chunk_size=8192):
                                f.write(chunk)
                except: pass
        
        copy_lines.append(f"\n## מודעה {i+1}{winner_tag} (התחלה: {start}, {days} ימים)")
        copy_lines.append(f"**כותרת:** {title}")
        copy_lines.append(f"**CTA:** {cta}")
        copy_lines.append(f"**לינק:** {link}")
        copy_lines.append(f"\n**קופי:**\n{body}\n---\n")
    
    with open(os.path.join(folder, "ads-copy.md"), "w") as f:
        f.write("\n".join(copy_lines))
    
    return folder
```

---

## שלב 6B — חילוץ Hooks מסרטונים (אופציונלי — דורש Replicate)

אחרי הורדת הקריאייטיבים, ספור כמה קבצי `.mp4` נשמרו לכל מתחרה.

**שאל את המשתמש:**

> "הורדתי X סרטונים של [מתחרה].
> רוצה שאחלץ את ה-Hook של כל סרטון — 3-5 המשפטים הראשונים שנאמרים?
>
> זה דורש חיבור ל-Replicate (חד-פעמי, חינם להרשמה)."

**אם המשתמש עונה כן:**

בדוק קודם אם יש token:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path.home() / ".claude"))
try:
    from master_keys import REPLICATE_API_TOKEN
    has_token = True
except:
    has_token = False
```

**אם אין token — הדרך להתחבר:**

> **איך מתחברים ל-Replicate (חד-פעמי):**
> 1. נכנסים ל-replicate.com ונרשמים (חינם, אפשר עם גוגל/גיטהאב)
> 2. נכנסים ל-Account Settings → API tokens
> 3. לוחצים "Create token" ומעתיקים
> 4. שולחים לי את ה-token ואני שומר אותו
>
> **אחרי שתשלח** — אוסיף לקובץ `~/.claude/master_keys.py`:
> `REPLICATE_API_TOKEN = 'r8_...'`
>
> **עלות:** כמה אגורות לסרטון (Whisper large-v3, ~30-90 שניות לסרטון ממוצע).

**כשיש token — תמלל וחלץ Hooks:**

```python
import requests, time, re, os

WHISPER_VERSION = "8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e"

def extract_hook(video_url, max_sentences=5):
    """
    מתמלל סרטון דרך Replicate Whisper וחולץ Hook.
    video_url = URL ישיר לסרטון (מה-API של פייסבוק/אינסטגרם).
    לא מעלים קובץ — שולחים URL ישיר.
    """
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path.home() / ".claude"))
    from master_keys import REPLICATE_API_TOKEN

    # שלח לתמלול
    pred_r = requests.post(
        "https://api.replicate.com/v1/predictions",
        headers={
            "Authorization": f"Bearer {REPLICATE_API_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "version": WHISPER_VERSION,
            "input": {
                "audio": video_url,
                "model": "large-v3",
                "language": "he",
                "translate": False,
                "word_timestamps": False
            }
        },
        timeout=30
    )
    pred_id = pred_r.json().get("id")
    if not pred_id:
        return None

    # חכה לתוצאה
    for _ in range(60):
        time.sleep(5)
        r = requests.get(
            f"https://api.replicate.com/v1/predictions/{pred_id}",
            headers={"Authorization": f"Bearer {REPLICATE_API_TOKEN}"}
        ).json()
        if r.get("status") == "succeeded":
            full_transcript = r.get("output", {}).get("transcription", "")
            sentences = re.split(r'(?<=[.!?])\s+', full_transcript.strip())
            hook = " ".join(sentences[:max_sentences])
            return {"hook": hook, "full_transcript": full_transcript}
        elif r.get("status") in ["failed", "canceled"]:
            return None
    return None
```

**חשוב לגבי Facebook CDN URLs:**
URLs של וידאו מ-Apify (`video_sd_url`) **פגים תוך כמה שעות** — פייסבוק מגביל גישה ל-CDN שלהם.
לכן: **תמיד הורד את הסרטון קודם** (שלב 6 עושה זאת ל-`.mp4`), ואז שלח את **הקובץ המקומי** ל-Replicate דרך upload.

```python
import base64, os

def extract_hook_from_file(video_path, max_sentences=5):
    """מתמלל קובץ וידאו מקומי דרך Replicate Whisper."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path.home() / ".claude"))
    from master_keys import REPLICATE_API_TOKEN

    if not os.path.exists(video_path):
        print(f"⚠️ קובץ לא נמצא: {video_path}")
        return None

    # העלה קובץ ל-Replicate Files API
    with open(video_path, "rb") as f:
        upload_r = requests.post(
            "https://api.replicate.com/v1/files",
            headers={"Authorization": f"Bearer {REPLICATE_API_TOKEN}"},
            files={"content": (os.path.basename(video_path), f, "video/mp4")},
            timeout=120
        )
    if upload_r.status_code != 201:
        print(f"⚠️ העלאה נכשלה: {upload_r.text}")
        return None
    file_url = upload_r.json().get("urls", {}).get("get")
    if not file_url:
        return None

    # שלח לתמלול
    pred_r = requests.post(
        "https://api.replicate.com/v1/predictions",
        headers={
            "Authorization": f"Bearer {REPLICATE_API_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "version": WHISPER_VERSION,
            "input": {
                "audio": file_url,
                "model": "large-v3",
                "language": "he",
                "translate": False,
                "word_timestamps": False
            }
        },
        timeout=30
    )
    pred_id = pred_r.json().get("id")
    if not pred_id:
        return None

    for _ in range(60):
        time.sleep(5)
        r = requests.get(
            f"https://api.replicate.com/v1/predictions/{pred_id}",
            headers={"Authorization": f"Bearer {REPLICATE_API_TOKEN}"}
        ).json()
        if r.get("status") == "succeeded":
            full_transcript = r.get("output", {}).get("transcription", "")
            sentences = re.split(r'(?<=[.!?])\s+', full_transcript.strip())
            hook = " ".join(sentences[:max_sentences])
            return {"hook": hook, "full_transcript": full_transcript}
        elif r.get("status") in ["failed", "canceled"]:
            return None
    return None
```

**שימוש:** קרא ל-`extract_hook_from_file(video_path)` על קבצי `.mp4` שנשמרו בשלב 6.
הישן `extract_hook(video_url)` שולח URL ישיר — **לא לשמש** עבור סרטוני פייסבוק (URLs פגים).
לאינסטגרם Reels — ה-URLs בדרך כלל פעילים יותר; אפשר לנסות עם URL ישיר, אם נכשל — הורד קודם.

**שמור קובץ `hooks.md` בתיקיית המתחרה:**

```markdown
# Hooks מסרטונים — [שם מתחרה]
> [X] סרטונים תומללו

## ad-01-video.mp4
**Hook (3-5 משפטים ראשונים):**
[הטקסט]

**תמלול מלא:**
[הטקסט המלא]

---

## ad-02-video.mp4
...
```

**אם המשתמש עונה לא** — ממשיך בלי תמלול, הסרטונים כבר שמורים בתיקייה.

---

## שלב 7 — ניתוח דפוסים

עבור כל מתחרה שנסרק — ענה על השאלות הבאות מהחומר שנאסף. **לא להמציא — רק מה שנמצא.**

### מודעות ממומנות (מ-ads-copy.md)
- **זווית שחוזרת:** מה ה-angle השכיח ביותר? (כאב / הבטחה / מנגנון / סיפור / שאלה)
- **פתיחת הוקים:** שאלה / הצהרה / מספר / ניפוץ אמונה — מה שולט?
- **ווינרים:** אלו מודעות רצו 30+ יום? מה משותף להן?
- **קריאייטיב:** תמונה / וידאו / מיקס? UGC / מקצועי / גרפי?
- **CTA:** לאן שולחים? (וואצאפ / דף נחיתה / ליד פורם / מסנג'ר)

### תוכן אורגני (מ-organic-posts.md, reels-analysis.md)
- **Reels:** מה הוק הפותח? (מ-caption) — מה מקבל views גבוה?
- **פוסטים:** זוויות שחוזרות, מה מקבל הכי הרבה תגובות/שיתופים?
- **ביו:** מה כתוב? איך מגדירים את עצמם?
- **תדירות:** כמה פוסטים בשבוע בממוצע?

### דפי נחיתה (מ-landing-page.md)
- **כותרת ראשית:** מה ההבטחה?
- **מנגנון:** האם מסבירים למה זה עובד אחרת?
- **הוכחות:** מספרים? קייסים? עדויות?
- **הצעה:** מה כלול, מחיר (אם גלוי), אחריות
- **CTA:** מה הפעולה? (שיחה / רכישה / ליד)

### השוואה לדף שלנו (אם קיים)
- מה אנחנו אומרים שהם לא?
- מה הם אומרים שאנחנו לא?
- איפה הבידול שלנו הכי חזק?
- מה הם אומרים שאנחנו אומרים גם — ולכן לא לחזור עליו?

---

## שלב 8 — מציאת פערים

הכי חשוב:

- **מה כולם אומרים** → שחוק, לא לעשות
- **מה אף אחד לא אומר** → הזדמנות לבידול
- **ווינר שרץ 30+ יום** → שווה לבדוק ולהתאים
- **סוג קריאייטיב שחסר** → הזדמנות ויזואלית
- **קהל שאף אחד לא פונה אליו** → הזדמנות טירגוט
- **זווית שעובדת באורגני אבל אף אחד לא מממן** → הזדמנות מודעה

---

## שלב 9 — פלט בצ'אט + שמירת דוח

### פלט בצ'אט — חובה

**כתוב בצ'אט markdown רגיל — לא בתוך code block.**
לכל מתחרה — גוש נפרד, בסדר הדירוג:

---

**פורמט לכל מתחרה:**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## [שם מתחרה] — [תחום / מוצר]

**מי הם**
אינסטגרם: [X] עוקבים | פייסבוק: [Y] עוקבים | מודעות פעילות: [Z]

**קישורי דפי נחיתה**
- [מוצר 1]: [URL נקי בלי UTM params]
- [מוצר 2 אם יש]: [URL]

**הצעה**
- [מוצר 1]: [תיאור קצר + מחיר אם גלוי]
- [מוצר 2 אם יש]: [תיאור + מחיר]
- CTA: [מה הפעולה המבוקשת]

**הוקים — ממומן (מקופי כתוב)**
- "[הוק מדויק — ציטוט מלא מהקופי]"
- "[הוק 2]"
- "[הוק 3]"
- עד 10 הוקים — כל הוק ייחודי שנמצא

**הוקים — מתמלול סרטונים (אם הופעל Replicate)**
- "[3-5 משפטים ראשונים מדויקים מהסרטון]" — סרטון X, X ימים
- "[הוק 2]"

**זוויות שיווק**
- כאב: [מה הכאב שמדברים עליו — ציטוטי]
- הבטחה: [מה מבטיחים — מספרים וספציפיות]
- מנגנון: [למה זה עובד אחרת — הסבר קצר]
- FOMO/הוכחה: [מה משתמשים — מספרים, SOLD OUT, קייסים]
- טון: [חברותי / סמכותי / אגרסיבי / רגשי]

**כאבים שמדברים עליהם**
- [כאב 1 — ספציפי ומדויק]
- [כאב 2]
- [כאב 3]

**חלומות ותוצאות שמבטיחים**
- [תוצאה 1 עם מספרים אם יש]
- [תוצאה 2]

**זהות שמוכרים**
- "[איזו אישה / גבר / אמא / יזם הלקוח רוצה להיות]"

**אמונות שמנפצים**
- "[אמונה מגבילה]" → [הנפצה]
- "[אמונה 2]" → [הנפצה]

**אורגני**
- Reels: [הוקים שמשיגים הכי הרבה views — ציטוט מדויק מהקאפשן]
- פוסטים: [זוויות שחוזרות, מה מקבל engagement]
- ביו: [מה כתוב בביו — ציטוט]

**סגנון קריאייטיב**
[תמונה / וידאו / מיקס] | [UGC / מקצועי / גרפי] | [טון ויזואלי]

📁 קבצים: competitor-research/[שם-מתחרה]/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

**אחרי כל המתחרים — גוש ניתוח:**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ניתוח שוק — פערים והזדמנויות

**מה כולם אומרים (שחוק — לא לחזור על זה):**
- [זווית 1]
- [זווית 2]

**מה אף אחד לא אומר (הזדמנות לבידול):**
- [מה חסר בשוק]

**זווית שעובדת באורגני ואף אחד לא ממן:**
- [זווית + למה שווה לנסות]

**קהל שאף אחד לא פונה אליו:**
- [תיאור הקהל]

**המלצה לקמפיין:**
[2-3 משפטים — מה לעשות אחרת מהשוק, מה הזווית שכדאי לבדוק ראשונה]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

### שמירת דוח

אחרי הפלט בצ'אט — שמור את אותו תוכן כ-`competitor-research.md` בתיקיית הפרויקט.
**אותו פורמט בדיוק** — לא טבלאות, לא code blocks — markdown רגיל כמו הפלט בצ'אט.

**סיכום קצר למשתמש:**

> **סיכום מחקר מתחרים:**
> — נחקרו X מתחרים ב-4 ערוצים
> — Z ווינרי מודעות (30+ יום) | N Reels הורדו
> — הזוויות הנפוצות: [רשימה]
> — הפערים שמצאתי: [רשימה]
>
> הדוח המלא: `competitor-research.md`
> קריאייטיבים: `competitor-research/`
>
> רוצה להמשיך ל-`/campaign-brief`?

---

## כללים

1. **סדר קבוע:** ספריית מודעות → אינסטגרם → פייסבוק → מיזוג → גוגל (העמקה בלבד)
2. **גוגל = העמקה, לא גילוי** — רק אחרי שהמתחרים זוהו ואושרו
3. **מיזוג:** מי שמופיע ב-2+ ערוצים עולה למעלה. ערוץ מודעות = x2
4. **ווינר = 30+ יום ריצה** — זמן ריצה הוא הפרוקסי הטוב ביותר להצלחה
5. **Reels רק מ-top 5** — חוסך קרדיטים, מספיק לניתוח
6. **פוסטים אורגניים רק מ-top 5** — אותו הגיון
7. **לא להמציא דאטה** — אם Apify מחזיר ריק, לדווח ולהציע אלטרנטיבה
8. **Actor הנכון לאינסטגרם:** `apify~instagram-profile-scraper` + `apify~instagram-reel-scraper`
9. **Actor הנכון לפייסבוק:** `apify~facebook-pages-scraper` + `apify~facebook-posts-scraper`
10. **תמלול אופציונלי** — רק אם המשתמש מאשר + יש Replicate token
11. **עברית בלבד** — כל הדוחות, הניתוח, הפלט
12. **עצור לאישור אחרי המיזוג** — לפני שמעמיקים על המתחרים
