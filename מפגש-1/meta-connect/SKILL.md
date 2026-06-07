---
name: meta-connect
description: חיבור חשבון META לקלוד קוד — יצירת System User Token קבוע, שליפת חשבונות/דפים/פיקסלים אוטומטית, ושמירה ב-CLAUDE.md.
allowed-tools: Bash, Read, Write, Edit
argument-hint: "[טוקן]"
---

# חיבור META — Meta Connect

סקיל שמחבר את חשבון המודעות של META לקלוד קוד. יוצר System User Token קבוע (לא פג לעולם), שולף הכל אוטומטית, ושומר ב-CLAUDE.md.

---

## 0. בדיקה — כבר מחובר?

בדוק אם יש סקשן "חיבור META" ב-CLAUDE.md בתיקייה הנוכחית.

אם כן — הצג את הפרטים ושאל:
> "כבר יש חיבור META:
> חשבון: [שם] — [act_ID]
> רוצה לעדכן טוקן / להחליף חשבון / לבדוק שהחיבור עובד?"

אם לא — המשך לשלב 1.

---

## 1. יצירת אפליקציה

בדוק אם המשתמש העביר טוקן כארגומנט. אם כן — דלג ישר לשלב 3.

אם לא — הדרך אותו צעד-צעד:

אמור:
> "בוא נחבר אותך ל-META. קודם ניצור אפליקציה:
> 
> 1. נכנסים ל-**developers.facebook.com** ומתחברים
> 2. לוחצים **My Apps** → **Create App**
> 3. בוחרים **Other** → **Business** → נותנים שם (למשל: 'סוכנות קלוד')
> 4. לוחצים **Create App**
> 
> יצרת? מעולה."

---

## 2. יצירת System User Token (קבוע — לא פג לעולם)

אמור:
> "עכשיו ניצור טוקן קבוע שלא פג לעולם:
> 
> 1. נכנסים ל-**business.facebook.com**
> 2. **Settings** (גלגל שיניים למטה משמאל) → **Business Settings**
> 3. בתפריט: **Users** → **System Users**
> 4. לוחצים **Add** → נותנים שם (למשל: 'claude-bot') → בוחרים **Admin** → **Create**
> 5. לוחצים **Add Assets** → **Ad Accounts** → מסמנים את החשבון → **Full Control** → **Save**
> 6. חוזרים ל-**Add Assets** → **Pages** → מסמנים את הדף → **Full Control** → **Save**
> 7. לוחצים **Generate New Token**
> 8. בוחרים את ה-**App** שיצרתם בשלב 1
> 9. מסמנים הרשאות:
>    - `ads_management`
>    - `ads_read`
>    - `pages_read_engagement`
>    - `pages_manage_ads`
>    - `business_management`
>    - `read_insights`
> 10. לוחצים **Generate Token**
> 11. **מעתיקים את הטוקן ומדביקים לי**"

**חכה שהמשתמש ידביק את הטוקן.**

---

## 3. שליפת חשבונות מודעות

הרץ:

```bash
curl -s "https://graph.facebook.com/v22.0/me/adaccounts?fields=name,account_id,account_status,currency,timezone_name&access_token=TOKEN"
```

**אם נכשל** — אמור:
> "הטוקן לא עובד. בדוק שהעתקת את כל הטוקן ושה-System User קיבל הרשאות לחשבון המודעות.
> תדביק שוב?"

**אם הצליח** — הצג רשימה:
> "אלה חשבונות המודעות שלך:
> 1. [שם] — act_XXXXX (ILS)
> 2. [שם] — act_XXXXX (USD)
> 
> איזה חשבון לחבר?"

---

## 4. שליפת דפים

```bash
curl -s "https://graph.facebook.com/v22.0/me/accounts?fields=name,id&access_token=TOKEN"
```

הצג ושאל:
> "אלה הדפים שלך:
> 1. [שם] — ID: XXXXX
> 2. [שם] — ID: XXXXX
> 
> איזה דף לחבר?"

---

## 5. שליפת פיקסלים

```bash
curl -s "https://graph.facebook.com/v22.0/act_XXXXX/adspixels?fields=name,id&access_token=TOKEN"
```

אם יש פיקסל אחד — בחר אוטומטית.
אם יש כמה — הצג ושאל.
אם אין — אמור: "אין פיקסל בחשבון הזה. נמשיך בלי, אפשר להוסיף אחר כך."

---

## 6. אימות

הרץ בדיקה מהירה:

```bash
curl -s "https://graph.facebook.com/v22.0/act_XXXXX?fields=name,currency,timezone_name,amount_spent&access_token=TOKEN"
```

**שים לב:** amount_spent מוחזר באגורות/סנטים. חלק ב-100 לפני הצגה.

הצג:
> "✓ מחובר!
> חשבון: [שם]
> מטבע: [currency]
> אזור זמן: [timezone]
> הוצאה כוללת: [amount_spent / 100] [currency]"

---

## 7. שמירה ב-CLAUDE.md

קרא את CLAUDE.md בתיקייה הנוכחית.

**אם יש סקשן "חיבור META"** — עדכן אותו.
**אם אין** — הוסף אותו לפני הסקשן האחרון (לפני "מבנה הסוכנות" אם קיים, אחרת בסוף).

הסקשן שנוסף:

```markdown
## חיבור META
- Ad Account: [שם] — act_XXXXX
- Page: [שם] — XXXXX
- Pixel: [שם] — XXXXX
- Token: [הטוקן המלא]
- סוג טוקן: System User (לא פג)
- Currency: [ILS/USD]
- Timezone: [timezone]
```

---

## 8. סיום

אמור:
> "✅ META מחובר עם טוקן קבוע!
> הטוקן הזה לא פג לעולם. לא תצטרך לחדש אותו.
> מהרגע הזה כל סקיל שעובד עם פייסבוק — קמפיינים, אנליטיקס, קריאייטיבים — יודע לגשת לחשבון שלך."
