# کاتالوگ الکترونیک — FNcatalogue

فرانت روی **Netlify**، دیتابیس **Firebase Firestore** (پروژه FNcatalogue).

---

## استقرار روی Netlify

1. **اتصال ریپو**  
   سایت را به Netlify وصل کنید (GitHub/GitLab یا آپلود).

2. **متغیرهای محیطی** (Site configuration → Environment variables):

   **مهم:** Lambda حداکثر ۴KB برای مجموع متغیرهای هر تابع دارد. **فقط یکی** از دو روش زیر را استفاده کنید (هر دو را با هم تنظیم نکنید):

   **روش الف — سه متغیر جدا (پیشنهادی؛ کم‌حجم‌تر):**

   | Key | Value |
   |-----|--------|
   | `FIREBASE_PROJECT_ID` | شناسهٔ پروژه (مثلاً `fncatalogue`) |
   | `FIREBASE_CLIENT_EMAIL` | مقدار `client_email` از فایل کلید سرویس |
   | `FIREBASE_PRIVATE_KEY` | مقدار `private_key` از فایل کلید سرویس (با خطوط واقعی یا `\n`) |
   | `SEED_SECRET` | یک رمز مخفی برای seed یک‌بار (مثلاً `fn123`) |

   **روش ب — یک JSON:**  
   به‌جای سه متغیر بالا می‌توانید **فقط** `FIREBASE_SERVICE_ACCOUNT_JSON` را با کل محتوای فایل JSON کلید سرویس پر کنید (و سه متغیر بالا را حذف کنید).

3. **Deploy**  
   Netlify با `netlify.toml` خودش فرانت را بیلد و API را به‌صورت تابع اجرا می‌کند.

---

## دادهٔ اولیه (Seed) — یک بار

بعد از اولین deploy، یک بار این آدرس را باز کنید (با همان مقدار `SEED_SECRET`):

```
https://fn-catalogue.netlify.app/api/admin/seed?secret=fn123
```

در صورت موفقیت، دسته‌ها، محصولات و کاربر ادمین ساخته می‌شوند.

---

## ورود به پنل مدیریت

- از منو **مدیریت** → ورود با **admin** / **admin123**

---

## ساختار پروژه

- **frontend/** — React (Vite). خروجی بیلد در `frontend/dist` روی Netlify سرو می‌شود.
- **backend/** — Express API برای اجرای محلی. روی Netlify کل API داخل `netlify/functions/` (server.js + firebase.js + firestore.js + seed.js) است و بدون وابستگی به پوشهٔ backend اجرا می‌شود.
- **netlify.toml** — تنظیمات بیلد، پوشهٔ publish، و redirect درخواست‌های `/api/*` به تابع. با ساخت `404.html` در بیلد، رفرش روی مسیرهایی مثل `/wishlist` و `/product/123` درست کار می‌کند.

دیتابیس **Firebase Firestore**؛ تصاویر محصولات در **Firebase Storage** ذخیره می‌شوند.

**تصاویر محصول:** آپلود از پنل ادمین با **Firebase SDK** (فرانت) انجام می‌شود؛ عکس در Storage (پوشهٔ `products/`) ذخیره و لینک آن با ذخیرهٔ محصول در Firestore ثبت می‌شود. در کنسول Firebase **Storage** را فعال کنید. چون آپلود از فرانت بدون Firebase Auth انجام می‌شود، برای مسیر `products` باید نوشتن مجاز باشد، مثلاً:
`match /products/{all} { allow read, write: if true; }`
(برای محیط واقعی بعداً می‌توانید با Firebase Auth محدود کنید.)

**تنظیم Firebase در فرانت (برای آپلود تصویر):** در Firebase Console → Project settings → Your apps یک اپ وب اضافه کنید و مقادیر را در Netlify به‌صورت متغیر محیطی برای **Build** قرار دهید (با پیشوند `VITE_` تا در فرانت در دسترس باشند):

| Key | Value |
|-----|--------|
| `VITE_FIREBASE_API_KEY` | apiKey از Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | مثلاً `fncatalogue.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | مثلاً `fncatalogue` |
| `VITE_FIREBASE_STORAGE_BUCKET` | مثلاً `fncatalogue.appspot.com` |

با این روش نیازی به تنظیم CORS باکت با gsutil نیست.

---

## توسعهٔ محلی (اختیاری)

برای تست روی سیستم خود:

- **فرانت:** `cd frontend && npm i && npm run dev` (پورت ۵۱۷۳؛ برای API از پروکسی Vite به بک‌اند استفاده می‌شود.)
- **بک‌اند:** فایل کلید سرویس را در `backend/` بگذارید، سپس `cd backend && npm i && npm run init-db && npm start` (پورت ۳۰۰۱).

برای seed از طریق Netlify نیازی به اجرای محلی نیست.
