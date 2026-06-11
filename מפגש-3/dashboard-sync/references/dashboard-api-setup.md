# Dashboard API Key — קבלה והגדרה

## מה זה ה-API Key

ה-API Key מזהה אותך (או את הלקוח שלך) בדשבורד הסוכנות.
כל push-leads request חייב לשלוח אותו ב-header:
```
Authorization: Bearer <API_KEY>
```

---

## שלב 1 — בדוק אם יש כבר API Key

```bash
# בדוק ב-master_keys
grep -i "DASHBOARD_API_KEY\|push.leads" ~/.claude/master_keys.py 2>/dev/null

# בדוק ב-env של הפרויקט (אם יש)
grep -i "API_KEY\|DASHBOARD" .env 2>/dev/null
```

**נמצא API Key?** → השתמש בו. סיים.

---

## שלב 2 — קבל API Key מהדשבורד

1. פתח את הדשבורד: **https://agency-dashboard-10x.vercel.app**
2. היכנס (Google Auth)
3. לחץ על **Settings** (גלגל שיניים) → **API Keys**
4. לחץ **"צור מפתח API חדש"**
5. תן שם: `Claude Code - <שם מחשב>`
6. **העתק את המפתח מיד** — לא תוכל לראות אותו שוב

---

## שלב 3 — שמור ב-master_keys.py

```bash
# הוסף לקובץ master_keys
cat >> ~/.claude/master_keys.py << 'EOF'

# --- AGENCY DASHBOARD ---
DASHBOARD_API_KEY = "<המפתח שהעתקת>"
# Usage: POST https://agency-dashboard-10x.vercel.app/api/push-leads
# Header: Authorization: Bearer <key>
EOF
```

---

## שלב 4 — בדיקת תקינות

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://agency-dashboard-10x.vercel.app/api/push-leads" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"client_name": "test", "leads": []}'
```

**תוצאה צפויה:** `400` (לא `401`) — פירושו שה-key תקין, רק הבקשה ריקה.
- `200` → תקין
- `400` → API Key תקין, body ריק (מצופה בבדיקה זו)
- `401` → API Key לא תקין. חזור לשלב 2.
- `500` → בעיה בשרת

---

## מבנה הבקשה המלאה

```bash
curl -s -X POST "https://agency-dashboard-10x.vercel.app/api/push-leads" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "נשים וכסף",
    "leads": [
      {
        "name": "שרה כהן",
        "phone": "0501234567",
        "email": "sara@example.com",
        "ref": "vesta_advantage-plus_vid-02",
        "date": "2026-06-01T10:00:00",
        "crm_lead_id": "rm_19644484"
      }
    ]
  }'
```

**תגובה:**
```json
{"inserted": 1}
```

---

## פרטים טכניים

- Endpoint: `POST /api/push-leads`
- Upsert לפי `crm_lead_id` — אין כפילויות
- `client_name` חייב להיות **בדיוק** כשם הלקוח בדשבורד (כולל רווחים)
- ה-`user_id` נקבע אוטומטית מה-API Key — לא ניתן לזייף
