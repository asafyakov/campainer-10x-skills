---
name: dashboard-sync
description: מסנכרן לידים מכל מערכת CRM (רב מסר, מאנדיי, גוגל שיטס, פאוורלינק, Airtable, CSV) לדשבורד הסוכנות דרך ה-API. פעם ראשונה — setup אוטומטי בשאלה אחת. מהפעם השנייה — סנכרון כל הלקוחות תוך 30 שניות. השתמש בסקיל זה בכל פעם שיש צורך למשוך לידים מ-CRM ולדחוף לדשבורד.
allowed-tools: Read, Write, Bash
argument-hint: "[שם-לקוח | setup | status | all]"
---

# dashboard-sync — CRM → דשבורד סוכנות

```
Claude Code
  → מתחבר ל-CRM של הלקוח (רב מסר / גוגל שיטס / מאנדיי / ...)
  → שולף לידים עם שדה ref/UTM
  → POST /api/push-leads + Bearer <api_key>
  → הדשבורד מציג לידים פר מודעה + עלות CRM + ייחוס
```

---

## זרימת פעולה — קרא לפני הכל

```
/dashboard-sync setup    ← פעם ראשונה בלבד (שאלה אחת → הכל אוטומטי)
/dashboard-sync all      ← סנכרן את כל הלקוחות
/dashboard-sync <שם>     ← סנכרן לקוח ספציפי
/dashboard-sync status   ← ראה מצב כל הלקוחות
```

---

## `/dashboard-sync setup` — הכל אוטומטי, שאלה אחת

כשמישהו מריץ `setup`, בצע בדיוק לפי הסדר הזה — ללא חריגות:

### צעד א׳ — בדוק מה כבר קיים

```bash
python3 - <<'EOF'
import os, re, glob

results = {}

# 1. API Key
keys_path = os.path.expanduser('~/.claude/master_keys.py')
if os.path.exists(keys_path):
    m = re.search(r'DASHBOARD_API_KEY\s*=\s*["\']([^"\']+)["\']', open(keys_path).read())
    results['api_key'] = m.group(1) if m else None
else:
    results['api_key'] = None

# 2. תיקיית לקוחות
# חפש תיקייה עם client.json בתת-תיקיות — שם כנראה יושבים הלקוחות
clients_dirs = []
for root, dirs, files in os.walk(os.path.expanduser('~/Desktop')):
    if 'client.json' in files:
        clients_dirs.append(os.path.dirname(root))
        break
    if root.count(os.sep) - os.path.expanduser('~/Desktop').count(os.sep) > 3:
        break

# 3. CLAUDE.md קיים?
cwd = os.getcwd()
claude_md = os.path.join(cwd, 'CLAUDE.md')
results['claude_md_exists'] = os.path.exists(claude_md)
results['claude_md_has_sync'] = False
if results['claude_md_exists']:
    results['claude_md_has_sync'] = 'dashboard-sync all' in open(claude_md, encoding='utf-8').read()

# 4. configs קיימים?
configs = glob.glob(os.path.expanduser('~/.claude/crm-configs/*.json'))
results['existing_configs'] = len(configs)

import json
print(json.dumps(results))
EOF
```

### צעד ב׳ — אם אין API Key, שאל שאלה אחת

הצג למשתמש:
```
🔑 נדרש API Key מהדשבורד

1. נכנס לדשבורד: https://agency-dashboard-10x.vercel.app
2. הגדרות → מפתחות API → "צור מפתח חדש"
3. תן לו שם (למשל: "Claude Code — [שם המחשב]")
4. העתק את המפתח — הוא מוצג פעם אחת בלבד

הדבק את המפתח כאן:
```

אחרי שהמשתמש הדביק → שמור **אוטומטית**:

```python
import os, re

api_key = API_KEY_FROM_USER.strip()
keys_path = os.path.expanduser('~/.claude/master_keys.py')

# צור קובץ אם לא קיים
if not os.path.exists(keys_path):
    os.makedirs(os.path.dirname(keys_path), exist_ok=True)
    with open(keys_path, 'w') as f:
        f.write("# MASTER KEYS — API credentials\n# CONFIDENTIAL — DO NOT SHARE\n\n")

content = open(keys_path, encoding='utf-8').read()

if 'DASHBOARD_API_KEY' in content:
    # עדכן קיים
    content = re.sub(
        r'DASHBOARD_API_KEY\s*=\s*["\'][^"\']*["\']',
        f'DASHBOARD_API_KEY = "{api_key}"',
        content
    )
else:
    # הוסף חדש
    content += f'\n\n# --- AGENCY DASHBOARD ---\n'
    content += f'DASHBOARD_API_KEY = "{api_key}"\n'
    content += f'# Usage: POST https://agency-dashboard-10x.vercel.app/api/push-leads\n'
    content += f'# Header: Authorization: Bearer <key>\n'

with open(keys_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ API Key נשמר")
```

### צעד ג׳ — הוסף סנכרון אוטומטי ל-CLAUDE.md

בדוק שה-CLAUDE.md של התיקייה הנוכחית (תיקיית הלקוחות) כולל את שורת הסנכרון:

```python
import os

claude_md_path = os.path.join(os.getcwd(), 'CLAUDE.md')
sync_block = """
## 🔄 סנכרון אוטומטי — Dashboard Sync

**בכל פתיחת סשן בתיקייה זו — הרץ מיידית:**
```
/dashboard-sync all
```
זה יסנכרן את כל הלקוחות שיש להם `client.json` עם `crm_sync`.
לסנכרון לקוח ספציפי: `/dashboard-sync מילי וליהי`
"""

if os.path.exists(claude_md_path):
    content = open(claude_md_path, encoding='utf-8').read()
    if 'dashboard-sync all' not in content:
        with open(claude_md_path, 'a', encoding='utf-8') as f:
            f.write(sync_block)
        print("✅ סנכרון אוטומטי נוסף ל-CLAUDE.md")
    else:
        print("✅ CLAUDE.md כבר מכיל סנכרון אוטומטי")
else:
    # צור CLAUDE.md חדש
    with open(claude_md_path, 'w', encoding='utf-8') as f:
        f.write(f"# CLAUDE.md — לקוחות סוכנות\n{sync_block}")
    print("✅ CLAUDE.md נוצר עם סנכרון אוטומטי")
```

### צעד ד׳ — בדיקת חיבור לדשבורד

```python
import urllib.request, json, re, os

keys_path = os.path.expanduser('~/.claude/master_keys.py')
content = open(keys_path, encoding='utf-8').read()
m = re.search(r'DASHBOARD_API_KEY\s*=\s*["\']([^"\']+)["\']', content)
api_key = m.group(1)

# ping עם ליד דמה
payload = json.dumps({
    "client_name": "__ping__",
    "leads": []
}).encode('utf-8')

req = urllib.request.Request(
    "https://agency-dashboard-10x.vercel.app/api/push-leads",
    data=payload,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(f"✅ חיבור לדשבורד — תקין")
except urllib.error.HTTPError as e:
    if e.code == 400:
        print(f"✅ חיבור לדשבורד — תקין (400 = לקוח לא קיים, API Key תקין)")
    elif e.code == 401:
        print(f"❌ API Key שגוי — בדוק שהעתקת נכון")
    else:
        print(f"⚠️ שגיאה {e.code} — בדוק חיבור אינטרנט")
```

### צעד ה׳ — סיכום setup

```
✅ dashboard-sync מוגדר ומוכן!

📁 API Key שמור: ~/.claude/master_keys.py
🔄 CLAUDE.md מעודכן: סנכרון אוטומטי בכל פתיחת סשן
📂 תיקייה נוכחית: <נתיב>

📋 הצעד הבא — הוסף client.json לכל לקוח:
   ראה דוגמה: ~/.claude/skills/dashboard-sync/references/client-json-examples.md

להרצה מיידית: /dashboard-sync all
```

---

## שלב 0 — וידוא API Key (בכל סנכרון)

```bash
python3 - <<'EOF'
import os, re, sys
keys_path = os.path.expanduser('~/.claude/master_keys.py')
if not os.path.exists(keys_path):
    print("לא נמצא"); sys.exit(1)
m = re.search(r'DASHBOARD_API_KEY\s*=\s*["\']([^"\']+)["\']', open(keys_path).read())
if m: print(m.group(1))
else: print("לא נמצא"); sys.exit(1)
EOF
```

**נמצא** → שמור את ה-key. המשך לשלב 1.  
**לא נמצא** → הרץ `/dashboard-sync setup` קודם.

---

## שלב 1 — זיהוי מצב

```bash
ls ~/.claude/crm-configs/ 2>/dev/null
find . -maxdepth 2 -name "client.json" 2>/dev/null
```

| מצב | פעולה |
|-----|-------|
| יש `~/.claude/crm-configs/<לקוח>.json` | שלב 5 — סנכרון מהיר |
| יש `client.json` עם `crm_sync` | שלב 1א — auto-setup |
| אין כלום | שלב 2 — הגדרה ידנית |

### שלב 1א — Auto-setup מ-client.json

```python
import json, glob, os

def find_client_json(client_name=None):
    matches = glob.glob('**/client.json', recursive=True)
    matches += glob.glob('*/client.json')
    for path in sorted(set(matches)):
        try:
            c = json.load(open(path, encoding='utf-8'))
            if client_name is None:
                return c, path
            if (client_name.lower() in c.get('client_name','').lower() or
                client_name.lower() in c.get('folder_name','').lower()):
                return c, path
        except: continue
    return None, None

client_json, path = find_client_json(CLIENT_ARG)  # CLIENT_ARG = ארגומנט שהועבר לסקיל

if client_json and client_json.get('crm_sync'):
    crm_sync = client_json['crm_sync']
    CRM_TYPE    = crm_sync.get('type', 'rav_mesar')
    LIST_ID     = crm_sync.get('list_id')
    CLIENT_NAME = client_json.get('client_name')
    print(f"✅ {CLIENT_NAME} | CRM: {CRM_TYPE} | list: {LIST_ID}")
    # → דלג ישירות לשלב 3
```

**מבנה client.json:**
```json
{
  "client_name": "נשים וכסף",
  "connections": {
    "rav_mesar": {
      "client_id": 231,
      "client_secret": "...",
      "user_token": "...",
      "account_id": 1005807
    }
  },
  "crm_sync": {
    "type": "rav_mesar",
    "list_id": 103567,
    "ref_field": "ref"
  }
}
```

---

## שלב 2 — הגדרה ידנית (רק אם אין client.json)

שאל **רק מה חסר:**

```
שם הלקוח בדשבורד? (בדיוק כפי שמופיע)
איזו מערכת CRM?
  [1] רב מסר / Responder.live
  [2] Google Sheets
  [3] Monday.com
  [4] PowerLink
  [5] Airtable
  [6] CSV מקומי
```

| CRM | Reference |
|-----|-----------|
| רב מסר | `references/rav-mesar.md` |
| Google Sheets | `references/google-sheets.md` |
| Monday.com | `references/monday.md` |
| PowerLink | `references/powerlink.md` |
| Airtable | `references/airtable.md` |
| CSV | `references/csv.md` |

---

## שלב 3 — בדיקת ref coverage

```python
from collections import Counter
refs = Counter()
for lead in raw_leads:
    ref = lead.get('ref') or lead.get('utm_campaign') or ''
    refs[ref.strip() or '(אין ref)'] += 1

for ref, count in sorted(refs.items(), key=lambda x: -x[1]):
    print(f"  {ref}: {count}")

total = sum(refs.values())
no_ref = refs.get('(אין ref)', 0)
coverage = round((1 - no_ref/total) * 100) if total else 0
print(f"Ref coverage: {coverage}% ({total-no_ref}/{total})")
```

**coverage < 50%** → קרא `references/ref-utm-guide.md` ועצור.  
**coverage >= 50%** → המשך.

---

## שלב 4 — מיפוי לידים

```python
import re
from datetime import datetime

def clean_phone(raw):
    phone = re.sub(r'\D', '', str(raw or ''))
    if phone.startswith('972'): phone = '0' + phone[3:]
    return phone

def parse_date(raw):
    for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S',
                '%d/%m/%Y %H:%M', '%d/%m/%Y', '%d.%m.%Y']:
        try: return datetime.strptime(str(raw).strip(), fmt).isoformat()
        except: continue
    return str(raw)

def map_lead(raw, ref_field='ref'):
    ref = raw.get(ref_field) or raw.get('utm_campaign') or ''
    return {
        'name':        raw.get('name') or raw.get('first', ''),
        'phone':       clean_phone(raw.get('phone', '')),
        'email':       raw.get('email', ''),
        'ref':         ref.strip(),
        'date':        parse_date(raw.get('date') or raw.get('created', '')),
        'crm_lead_id': str(raw.get('crm_lead_id') or raw.get('id', '')),
    }

rows = [map_lead(l) for l in raw_leads]
```

---

## שלב 5 — דחיפה לדשבורד

```python
import json, urllib.request, re, os

keys_path = os.path.expanduser('~/.claude/master_keys.py')
m = re.search(r'DASHBOARD_API_KEY\s*=\s*["\']([^"\']+)["\']', open(keys_path).read())
API_KEY = m.group(1)
DASHBOARD_URL = 'https://agency-dashboard-10x.vercel.app'

payload = json.dumps({"client_name": CLIENT_NAME, "leads": rows}).encode('utf-8')
req = urllib.request.Request(
    f"{DASHBOARD_URL}/api/push-leads",
    data=payload,
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
        print(f"✅ הוכנסו: {result.get('inserted', 0)} לידים")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"❌ שגיאה {e.code}: {body}")
    if e.code == 401: print("→ API Key שגוי. הרץ /dashboard-sync setup")
    if e.code == 400: print("→ שם לקוח לא תואם. בדוק שם מדויק בדשבורד.")
```

---

## שלב 6 — 5 בדיקות חובה

```python
checks = [
    ("API מחזיר 200",              result is not None),
    ("inserted > 0",               result.get('inserted', 0) > 0),
    ("ref coverage >= 50%",        coverage >= 50),
    ("פורמט טלפון >= 80%",         sum(1 for r in rows if len(r['phone'])==10 and r['phone'].startswith('0')) / len(rows) >= 0.8 if rows else False),
    ("תאריכים סבירים 2020-2027",   all('2020' <= r['date'][:4] <= '2027' for r in rows if r['date'][:4].isdigit())),
]
for name, passed in checks:
    print(f"  {'✅' if passed else '⚠️'} {name}")
```

---

## שלב 7 — שמירת Config

```python
import json, os, datetime, re

os.makedirs(os.path.expanduser('~/.claude/crm-configs'), exist_ok=True)
slug = CLIENT_NAME.replace(' ', '-').replace('/', '-').lower()
config = {
    "client_name":     CLIENT_NAME,
    "client_slug":     slug,
    "dashboard_url":   DASHBOARD_URL,
    "api_key":         API_KEY,
    "crm": {"type": CRM_TYPE, "credentials": CRM_CREDS, "list_id": LIST_ID, "ref_field": "ref"},
    "last_sync":       datetime.datetime.utcnow().isoformat() + "Z",
    "last_sync_count": len(rows),
}
with open(os.path.expanduser(f'~/.claude/crm-configs/{slug}.json'), 'w', encoding='utf-8') as f:
    json.dump(config, f, ensure_ascii=False, indent=2)
print(f"✅ Config נשמר → בפעם הבאה: /dashboard-sync {CLIENT_NAME}")
```

---

## `/dashboard-sync all` — כל הלקוחות

```python
import json, glob, os

# מחפש את כל ה-client.json בתיקייה הנוכחית
all_clients = []
for path in glob.glob('*/client.json') + glob.glob('**/client.json', recursive=True):
    try:
        c = json.load(open(path, encoding='utf-8'))
        if c.get('crm_sync'):
            all_clients.append((c, path))
    except: continue

if not all_clients:
    # חפש ב-crm-configs
    for path in glob.glob(os.path.expanduser('~/.claude/crm-configs/*.json')):
        c = json.load(open(path, encoding='utf-8'))
        all_clients.append((c, path))

print(f"🔄 מסנכרן {len(all_clients)} לקוחות...")
for client, path in all_clients:
    # הרץ את זרימת השלבים 1א→3→4→5→6→7 עבור כל לקוח
    print(f"\n── {client.get('client_name', path)} ──")
```

---

## `/dashboard-sync status`

```python
import json, glob, os, datetime

configs = sorted(glob.glob(os.path.expanduser('~/.claude/crm-configs/*.json')))
client_jsons = glob.glob('*/client.json') + glob.glob('**/client.json', recursive=True)

print(f"{'לקוח':22} | {'CRM':12} | {'סנכרון אחרון':12} | לידים | מצב")
print("─" * 72)

for path in client_jsons:
    try:
        c = json.load(open(path, encoding='utf-8'))
        if not c.get('crm_sync'): continue
        cfg_path = os.path.expanduser(f"~/.claude/crm-configs/{c['client_name'].replace(' ','-').lower()}.json")
        if os.path.exists(cfg_path):
            cfg = json.load(open(cfg_path))
            last = cfg.get('last_sync','אף פעם')[:10]
            count = cfg.get('last_sync_count', 0)
            status = "✅"
        else:
            last, count, status = "אף פעם", 0, "⏳ לא סונכרן"
        print(f"{c['client_name']:22} | {c['crm_sync']['type']:12} | {last:12} | {count:5} | {status}")
    except: continue
```

---

## שגיאות נפוצות

| שגיאה | סיבה | פתרון |
|--------|-------|--------|
| `401` | API Key שגוי/חסר | הרץ `/dashboard-sync setup` |
| `400 client_name` | שם לקוח לא תואם | ודא שם מדויק כבדשבורד |
| `JWT expired` (רב מסר) | JWT פג כל 14 יום | הסקיל מחדש JWT אוטומטית |
| `inserted: 0` | כל הלידים כפולים | תקין — upsert לפי crm_lead_id |
| ref ריק | ref לא מוגדר בדפי יעד | ראה `references/ref-utm-guide.md` |
