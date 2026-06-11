# רב מסר / Responder.live — חיבור מלא

## פרטים נדרשים

| שדה | מאיפה לקחת |
|-----|-----------|
| `client_id` | Responder → Settings → API → Client ID |
| `client_secret` | Responder → Settings → API → Client Secret |
| `user_token` | Responder → Settings → API → User Token |
| `account_id` | מה-URL של החשבון בלוח הבקרה |
| `list_id` | Responder → Lists → לחץ על הרשימה → ה-ID ב-URL |

---

## שלב 1 — קבלת JWT

JWT תקף ~14 יום. הסקיל מחדש אוטומטית בכל הפעלה.

```bash
JWT=$(curl -s -X POST "https://graph.responder.live/v2/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "user_token",
    "client_id": <CLIENT_ID>,
    "client_secret": "<CLIENT_SECRET>",
    "user_token": "<USER_TOKEN>"
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))")

echo "JWT: $JWT"
echo "Account: $(curl -s ... | python3 -c "...d.get('account_id')")"
```

```python
import json, urllib.request

def get_jwt(client_id, client_secret, user_token):
    payload = json.dumps({
        "grant_type": "user_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "user_token": user_token
    }).encode()
    req = urllib.request.Request(
        "https://graph.responder.live/v2/oauth/token",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        d = json.loads(resp.read())
    if not d.get('token'):
        raise Exception(f"JWT failed: {d}")
    return d['token'], d.get('account_id')
```

---

## שלב 2 — שליפת לידים מרשימה

```python
def fetch_rav_mesar_leads(jwt, account_id, list_id, limit=1000):
    url = (f"https://graph.responder.live/v2/lists/{list_id}/subscribers"
           f"?account_id={account_id}&limit={limit}")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {jwt}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data.get('data', [])
```

**Pagination:** אם `total > limit`, הוסף `&page=2`, `&page=3`...

```python
def fetch_all_leads(jwt, account_id, list_id):
    all_leads = []
    page = 1
    while True:
        url = (f"https://graph.responder.live/v2/lists/{list_id}/subscribers"
               f"?account_id={account_id}&limit=500&page={page}")
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {jwt}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        batch = data.get('data', [])
        all_leads.extend(batch)
        if len(all_leads) >= data.get('total', 0) or not batch:
            break
        page += 1
    return all_leads
```

---

## שלב 3 — מיפוי שדה ref

השדות של המנוי נמצאים ב-`personal_fields` (dict `{field_id: value}`)
ושמות השדות ב-`fields_names` (dict `{field_id: field_name}`).

```python
def get_ref(subscriber):
    names = subscriber.get('fields_names', {})
    fields = subscriber.get('personal_fields', {})
    for fid, fname in names.items():
        if fname == 'ref':
            val = (fields.get(fid) or '').strip()
            # נקה invisible chars (RTL marks)
            val = ''.join(c for c in val if c.isprintable())
            return val
    return ''

def get_field(subscriber, field_name):
    """מצא כל שדה לפי שם"""
    names = subscriber.get('fields_names', {})
    fields = subscriber.get('personal_fields', {})
    for fid, fname in names.items():
        if fname == field_name:
            return (fields.get(fid) or '').strip()
    return ''
```

---

## שלב 4 — מיפוי מלא לפורמט הדשבורד

```python
import re

def map_subscriber(sub):
    phone = re.sub(r'\D', '', sub.get('phone', ''))
    if phone.startswith('972'): phone = '0' + phone[3:]
    
    return {
        'name':        sub.get('name') or sub.get('first', ''),
        'phone':       phone,
        'email':       sub.get('email', ''),
        'ref':         get_ref(sub),
        'date':        sub.get('created', ''),   # format: "2026-06-01 10:00:00"
        'crm_lead_id': f"rm_{sub.get('subscriber_id', sub.get('id', ''))}",
    }
```

---

## קוד מלא מקצה לקצה

```python
import json, urllib.request, re

# 1. פרטי חיבור (מה-client.json או master_keys)
CLIENT_ID     = 231
CLIENT_SECRET = "ABHdCx01tFO4zamzS9EVivIYgcuUZDDJhQpl9IsN"
USER_TOKEN    = "ca2f62b0fdb960ce553b6cf6486a3fc5a6305434c3affe829d13316613ef1a21"
ACCOUNT_ID    = 1005807
LIST_ID       = 103567

# 2. JWT
jwt, _ = get_jwt(CLIENT_ID, CLIENT_SECRET, USER_TOKEN)
print(f"✅ JWT קיבלתי")

# 3. שלוף לידים
raw = fetch_all_leads(jwt, ACCOUNT_ID, LIST_ID)
print(f"📋 {len(raw)} מנויים ברשימה {LIST_ID}")

# 4. מפה
rows = [map_subscriber(s) for s in raw]

# 5. הצג ref distribution
from collections import Counter
refs = Counter(r['ref'] or '(אין ref)' for r in rows)
for ref, count in sorted(refs.items(), key=lambda x: -x[1]):
    print(f"  {ref}: {count}")
```

---

## שמירה ב-Config

```python
CRM_TYPE  = "rav_mesar"
CRM_CREDS = {
    "client_id":     CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "user_token":    USER_TOKEN,
    "account_id":    ACCOUNT_ID,
}
LIST_ID = LIST_ID
```

---

## בעיות נפוצות

| בעיה | פתרון |
|------|-------|
| `JWT` ריק בתגובה | בדוק `client_id`, `client_secret`, `user_token` |
| `total: 0` | בדוק `list_id` ו-`account_id` |
| `ref` ריק על כולם | בדוק שם השדה ב-Responder (אולי `utm_campaign` במקום `ref`) |
| invisible chars ב-ref | הקוד מנקה אותם אוטומטית עם `isprintable()` |
| `403 Forbidden` | `account_id` שגוי — קח מ-URL של הלוח בקרה |
