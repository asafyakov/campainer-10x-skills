# Google Sheets — חיבור מלא

## שני מצבים

| מצב | תיאור |
|-----|--------|
| **גיליון ציבורי** | פתוח לצפייה — אין צורך ב-API Key |
| **גיליון פרטי** | דורש Service Account |

---

## מצב 1 — גיליון ציבורי (הנפוץ ביותר)

**שליפה דרך gviz endpoint** (CSV):
```bash
# URL של הגיליון: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit#gid=<GID>
curl -s "https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&gid=<GID>"
```

**Python:**
```python
import csv, urllib.request, io

def fetch_google_sheet(sheet_id, gid=0):
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&gid={gid}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content))
    return list(reader)

rows = fetch_google_sheet("1GC8U6wVqHGJGG4qfXVU76bKFX5t-3BIN")
print(f"שורות: {len(rows)}")
print("עמודות:", list(rows[0].keys()) if rows else [])
```

---

## זיהוי SHEET_ID ו-GID מה-URL

```
https://docs.google.com/spreadsheets/d/1GC8U6wVqHGJGG4qfXVU76bKFX5t-3BIN/edit#gid=123456
                                        ↑ SHEET_ID                              ↑ GID
```

אם GID = 0 (גיליון ראשון) — אפשר להשמיט את הפרמטר.

---

## מיפוי עמודות

לאחר שליפה, הצג שמות עמודות ושאל:

```python
print("עמודות בגיליון:")
for i, col in enumerate(rows[0].keys()):
    print(f"  {i+1}. '{col}'")
```

שאל: "איזו עמודה היא ref/מקור המודעה?"

**מיפוי גמיש** — הגיליון עשוי להכיל עמודות בשמות שונים:

```python
# ניחוש אוטומטי של עמודות לפי שמות נפוצים
COLUMN_ALIASES = {
    'name':  ['שם', 'שם מלא', 'name', 'full_name', 'first_name'],
    'phone': ['טלפון', 'נייד', 'phone', 'mobile', 'tel'],
    'email': ['מייל', 'אימייל', 'email', 'e-mail'],
    'ref':   ['ref', 'מקור', 'source', 'utm_campaign', 'utm', 'campaign', 'ממוצא'],
    'date':  ['תאריך', 'date', 'created', 'timestamp', 'נרשם'],
    'id':    ['id', 'מזהה', 'lead_id', 'row_id'],
}

def detect_columns(headers):
    mapping = {}
    headers_lower = {h.lower().strip(): h for h in headers}
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias.lower() in headers_lower:
                mapping[field] = headers_lower[alias.lower()]
                break
    return mapping

col_map = detect_columns(list(rows[0].keys()))
print("זיהוי עמודות:", col_map)
```

---

## מיפוי שורה לפורמט הדשבורד

```python
import re
from datetime import datetime

def map_sheet_row(row, col_map, row_index):
    def get(field):
        col = col_map.get(field, '')
        return row.get(col, '').strip() if col else ''
    
    phone = re.sub(r'\D', '', get('phone'))
    if phone.startswith('972'): phone = '0' + phone[3:]
    
    # parse date
    date_raw = get('date')
    date_iso = date_raw
    for fmt in ['%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%d/%m/%Y',
                '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%d.%m.%Y']:
        try:
            date_iso = datetime.strptime(date_raw, fmt).isoformat()
            break
        except: pass
    
    crm_id = get('id') or f"gs_{row_index}"
    
    return {
        'name':        get('name'),
        'phone':       phone,
        'email':       get('email'),
        'ref':         get('ref'),
        'date':        date_iso,
        'crm_lead_id': crm_id,
    }

mapped = [map_sheet_row(r, col_map, i) for i, r in enumerate(rows)]
```

---

## מצב 2 — גיליון פרטי (Service Account)

**דרוש:** קובץ Service Account JSON מ-Google Cloud Console.

```python
# pip install google-auth google-auth-httplib2 google-api-python-client
from googleapiclient.discovery import build
from google.oauth2 import service_account

SERVICE_ACCOUNT_FILE = '/path/to/service-account.json'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)
service = build('sheets', 'v4', credentials=creds)

sheet = service.spreadsheets()
result = sheet.values().get(
    spreadsheetId=SHEET_ID,
    range='A:Z'  # כל העמודות
).execute()
values = result.get('values', [])
headers = values[0]
rows = [dict(zip(headers, row)) for row in values[1:]]
```

---

## שמירה ב-Config

```python
CRM_TYPE  = "google_sheets"
CRM_CREDS = {
    "sheet_id": SHEET_ID,
    "gid":      GID,     # 0 לגיליון ראשון
    "public":   True,    # False = Service Account
    "col_map":  col_map, # שמור את המיפוי שזיהינו
}
LIST_ID = f"{SHEET_ID}_{GID}"
```

---

## בעיות נפוצות

| בעיה | פתרון |
|------|-------|
| `403 Forbidden` | הגיליון פרטי → השתמש ב-Service Account |
| `CSV ריק` | GID שגוי → בדוק ב-URL של הגיליון |
| עמודות לא זוהו | הצג `col_map` ותקן ידנית |
| `BOM` בכותרות | `utf-8-sig` encoding כבר מטפל בזה |
