# מדריך ref / UTM — הגדרה ומוסכמות

## למה ref חשוב

הדשבורד מתאים לידים למודעות לפי שדה `ref` (או `utm_campaign`).
**בלי ref** — הדשבורד יודע כמה לידים יש בסה"כ, אבל לא יוכל להגיד מאיזו מודעה כל ליד הגיע.

**עם ref** — הדשבורד מציג:
- עלות CRM פר מודעה (spend ÷ CRM leads)
- איזו מודעה מביאה לידים שהופכים ללקוחות
- פערים בין תוצאות פייסבוק ולידים אמיתיים ב-CRM

---

## מוסכמת ref מומלצת

```
<client>_<targeting>_<creative>
```

### דוגמאות:

| מודעה | ref |
|-------|-----|
| וסטה — קהל רימרקטינג 30 יום — וידאו 01 | `vesta_visitors-30_vid-01` |
| וסטה — Advantage+ — וידאו 02 | `vesta_advantage-plus_vid-02` |
| כנען — לוקאלייק 3% — תמונה 01 | `canaan_lookalike-3pct_img-01` |
| משקיעה בקליק — כל הטראפיק — וידאו A | `click_all_vid-a` |

### כללים:

- **כל מודעה/אדסט — ref שונה** (גם אם הקריאייטיב זהה, הקהל שונה)
- **אותיות קטנות + מקפים** — ללא רווחים, ללא עברית
- **קצר** — עד 50 תווים
- **עקבי** — תמיד אותה מוסכמה לאותו לקוח

---

## איך מוסיפים ref למודעה בפייסבוק

### אפשרות 1 — ב-URL של דף היעד (הנפוץ ביותר)

בכל מודעה/אדסט, בשדה "Website URL" / "כתובת יעד":

```
https://example.com/landing-page?ref=vesta_visitors-30_vid-01
```

**ב-Advantage+ Shopping Campaigns:**
בשדה `asset_feed_spec.link_urls[].website_url`

**ב-Link Ads:**
בשדה `object_story_spec.link_data.link`

**ב-Video Ads:**
בשדה `object_story_spec.video_data.call_to_action.value.link`

### אפשרות 2 — URL Parameters (Ads Manager)

בהגדרות המודעה → "URL Parameters" → הוסף:
```
ref={{adset.name}}_vid-01
```

⚠️ `{{adset.name}}` מחליף את שם האדסט אוטומטית — שימושי אם כל אדסט שם שונה.

### אפשרות 3 — UTM Campaign

אם הדף כבר משתמש ב-UTM:
```
https://example.com/landing-page?utm_campaign=vesta_visitors-30&utm_source=facebook
```

הדשבורד מזהה `utm_campaign` ומשתמש בו כ-ref.

---

## בדיקה שה-ref עובד

### שלב 1 — בדוק שהרב מסר/CRM קולט את ה-ref

אחרי שמפרסמים מודעה עם ref חדש ומישהו נרשם:

**ברב מסר:**
```bash
# חפש מנוי לפי טלפון/מייל ובדוק את השדה ref
curl -s "https://graph.responder.live/v2/lists/<LIST_ID>/subscribers?account_id=<ACCT_ID>&limit=10" \
  -H "Authorization: Bearer <JWT>" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for s in d['data'][:3]:
    refs = {n: s['personal_fields'].get(fid) for fid, n in s.get('fields_names', {}).items()}
    print(s.get('name'), '|', refs)
"
```

**ב-Google Sheets:**
בדוק שיש עמודה "ref" / "מקור" שמכילה את הערך.

### שלב 2 — הרץ /dashboard-sync ובדוק ref distribution

```
Ref coverage: 95% (47/51)
  vesta_visitors-30_vid-01: 7
  vesta_advantage-plus_vid-02: 14
  vesta_purchase_vid-03: 22
  (אין ref): 3  ← תקין — ייתכן שנרשמו ישירות
```

---

## טיפול ב-ref שכבר קיים אבל לא תואם

### בעיה — ref מגיע עם prefix מיותר:
```
# ה-CRM מקבל: "vesta_visitors-30_vid-01&utm_source=fb"  ← יש זבל בסוף
```

**פתרון בקוד המיפוי:**
```python
def clean_ref(raw_ref):
    if not raw_ref: return ''
    # קח רק עד & ראשון
    ref = raw_ref.split('&')[0].strip()
    # הסר visible chars (RTL marks)
    ref = ''.join(c for c in ref if c.isprintable())
    return ref
```

### בעיה — UTM נמצא ב-URL מלא:
```
# ה-CRM מקבל: "https://example.com?utm_campaign=vesta_vid-01&utm_source=fb"
```

**פתרון:**
```python
from urllib.parse import urlparse, parse_qs

def extract_ref_from_url(url_or_ref):
    if not url_or_ref: return ''
    if url_or_ref.startswith('http'):
        qs = parse_qs(urlparse(url_or_ref).query)
        return qs.get('ref', qs.get('utm_campaign', ['']))[0]
    return url_or_ref.strip()
```

---

## מה לעשות אם ה-CRM לא מעביר ref

חלק מדפי נחיתה/CRM לא מעבירים את פרמטר ה-URL לרשימה.

**בדיקה:** הירשם בעצמך דרך URL עם `?ref=test_001` ובדוק אם `test_001` הגיע ל-CRM.

**פתרון נפוץ — רב מסר:**
ב-Responder, בהגדרות הטופס → "שדות נסתרים" → הוסף שדה `ref` שמשתמש בפרמטר URL.

**פתרון נפוץ — rav.page:**
בבניית הדף → הגדרות טופס → "העבר פרמטרים מה-URL" → הפעל.
