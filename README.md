# کاتالوگ الکترونیک — FNcatalogue

فرانت روی **Netlify**، دیتابیس **Firebase Firestore** (پروژه FNcatalogue).

---

## استقرار روی Netlify

1. **اتصال ریپو**  
   سایت را به Netlify وصل کنید (GitHub/GitLab یا آپلود).

2. **متغیرهای محیطی** (Site configuration → Environment variables):

   | Key | Value |
   |-----|--------|
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | کل محتوای فایل JSON کلید سرویس Firebase (از Console → Project settings → Service accounts → Generate new private key). فقط از `{` تا `}` را کپی کنید. |
   | `SEED_SECRET` | یک رمز مخفی برای seed یک‌بار (مثلاً `fn123`) |

3. **Deploy**  
   Netlify با `netlify.toml` خودش فرانت را بیلد و API را به‌صورت تابع اجرا می‌کند.

---

## دادهٔ اولیه (Seed) — یک بار

بعد از اولین deploy، یک بار این آدرس را باز کنید (با همان مقدار `SEED_SECRET`):

```
https://آدرس-سایت-شما.netlify.app/api/admin/seed?secret=fn123
```

در صورت موفقیت، دسته‌ها، محصولات و کاربر ادمین ساخته می‌شوند.

---

## ورود به پنل مدیریت

- از منو **مدیریت** → ورود با **admin** / **admin123**

---

## ساختار پروژه

- **frontend/** — React (Vite). خروجی بیلد در `frontend/dist` روی Netlify سرو می‌شود.
- **backend/** — Express API با Firebase Firestore. روی Netlify به‌صورت تابع در `netlify/functions/server.js` اجرا می‌شود.
- **netlify.toml** — تنظیمات بیلد، پوشهٔ publish، و redirect درخواست‌های `/api/*` به تابع. با ساخت `404.html` در بیلد، رفرش روی مسیرهایی مثل `/wishlist` و `/product/123` درست کار می‌کند.

دیتابیس فقط **Firebase Firestore** است؛ SQLite یا فایل دیتابیس دیگری استفاده نمی‌شود.  
در پنل ادمین روی Netlify برای تصویر محصول از **URL تصویر** استفاده کنید (آپلود فایل روی سرور ذخیره نمی‌شود).

---

## توسعهٔ محلی (اختیاری)

برای تست روی سیستم خود:

- **فرانت:** `cd frontend && npm i && npm run dev` (پورت ۵۱۷۳؛ برای API از پروکسی Vite به بک‌اند استفاده می‌شود.)
- **بک‌اند:** فایل کلید سرویس را در `backend/` بگذارید، سپس `cd backend && npm i && npm run init-db && npm start` (پورت ۳۰۰۱).

برای seed از طریق Netlify نیازی به اجرای محلی نیست.
