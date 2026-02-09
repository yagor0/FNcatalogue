# کاتالوگ الکترونیک فروشگاه آنلاین

پروژه درس فن‌آوری (تجارت الکترونیک) — پیاده‌سازی تحت وب.

## نیازمندی‌ها

- Node.js 18+
- npm
- **یکی از دو حالت:**
  - **امولاتور (بدون پروژه واقعی):** نصب [Firebase CLI](https://firebase.google.com/docs/cli)
  - **Firebase واقعی:** پروژه FNcatalogue و فایل کلید سرویس (Service Account JSON)

## نصب و اجرا

### حالت الف: اجرا با Firestore Emulator (بدون پروژه Firebase)

برای توسعهٔ محلی بدون اتصال به Firebase واقعی:

1. نصب Firebase CLI (یک بار):
   ```bash
   npm install -g firebase-tools
   ```

2. در **ترمینال اول** امولاتور Firestore را اجرا کنید (از ریشهٔ پروژه):
   ```bash
   firebase emulators:start --only firestore
   ```
   (پورت پیش‌فرض Firestore: `8080`)

3. در **ترمینال دوم** متغیر محیطی را تنظیم و بک‌اند را اجرا کنید:
   - **Windows (PowerShell):**
     ```powershell
     cd backend
     npm install
     $env:FIRESTORE_EMULATOR_HOST="localhost:8080"
     npm run init-db
     npm start
     ```
   - **Windows (CMD) یا لینوکس/مک:**
     ```bash
     cd backend
     npm install
     set FIRESTORE_EMULATOR_HOST=localhost:8080   # فقط CMD
     npm run init-db
     npm start
     ```
     در لینوکس/مک به‌جای `set` از `export FIRESTORE_EMULATOR_HOST=localhost:8080` استفاده کنید.

بک‌اند به امولاتور متصل می‌شود و نیازی به فایل کلید Firebase نیست.

### حالت ب: اجرا با پروژهٔ واقعی Firebase (FNcatalogue)

1. فایل کلید Firebase را در پوشهٔ `backend/` قرار دهید:
   - نام فایل: `firebase-service-account.json` یا `fncatalogue-firebase-adminsdk-fbsvc-f83dce6006.json`
   - یا مسیر فایل را در متغیر محیطی بگذارید: `GOOGLE_APPLICATION_CREDENTIALS=مسیر/به/filename.json`

2. نصب و مقداردهی و اجرا:
   ```bash
   cd backend
   npm install
   npm run init-db
   npm start
   ```

سرور API روی `http://localhost:3001` اجرا می‌شود.

### ۲. Frontend (رابط کاربری)

در یک ترمینال دیگر:

```bash
cd frontend
npm install
npm run dev
```

 برنامه تحت وب روی `http://localhost:5173` باز می‌شود.

### ورود به پنل مدیریت

- آدرس: **مدیریت** در منو → ورود
- نام کاربری: `admin`
- رمز عبور: `admin123`

---

## استقرار روی Netlify (با دیتابیس Firebase FNcatalogue)

پروژه برای اجرا روی Netlify و اتصال به **Firestore** پروژهٔ **FNcatalogue** آماده است.

### ۱. تنظیمات در Netlify

1. ریپو را به Netlify وصل کنید (از گیت یا آپلود).
2. در **Site configuration → Environment variables** این متغیر را اضافه کنید:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value:** محتوای **کل** فایل JSON کلید سرویس (Service Account Key) را کپی کنید (از Firebase Console → Project settings → Service accounts → Generate new private key). مقدار باید یک رشتهٔ JSON معتبر باشد (از `{` تا `}`).

3. Build را ذخیره کنید. Netlify با دستور و مسیر تعریف‌شده در `netlify.toml` فرانت را بیلد و تابع سرور را برای API اجرا می‌کند.

### ۲. قوانین Firestore

قوانین فعلی شما (`allow read, write: if false`) فقط برای **دسترسی از سمت کلاینت (SDK وب/موبایل)** اعمال می‌شوند.  
**Backend این پروژه از Firebase Admin SDK استفاده می‌کند و از این قوانین عبور می‌کند**؛ بنابراین API روی Netlify بدون تغییر قوانین کار می‌کند. اگر بخواهید فقط سرور به Firestore دسترسی داشته باشد، همین قوانین مناسب است.

### ۳. دادهٔ اولیه (Seed)

پس از اولین استقرار، یک بار به‌صورت محلی با اتصال به همان پروژهٔ Firebase دستور seed را اجرا کنید:

```bash
cd backend
# تنظیم FIREBASE_SERVICE_ACCOUNT_JSON یا استفاده از فایل کلید
npm run init-db
```

بعد از آن، ورود ادمین با `admin` / `admin123` ممکن است نیاز به اضافه‌کردن کاربر در Firestore داشته باشد (اسکریپت `init-db` این کار را انجام می‌دهد).

### ۴. آپلود تصویر روی Netlify

در محیط Netlify، آپلود فایل تصویر به‌صورت موقت در حافظه پردازش می‌شود و روی دیسک ذخیره نمی‌شود. برای افزودن/ویرایش محصول در پنل ادمین، از فیلد **URL تصویر** استفاده کنید یا تصویر را در جای دیگری (مثلاً Firebase Storage یا CDN) آپلود کنید و لینک را بگذارید.

---

## ساختار پروژه

- `backend/` — سرور Express + Firebase Firestore، API محصولات، دسته‌بندی، علاقه‌مندی، تاریخچه، پنل ادمین
- `frontend/` — اپلیکیشن React (Vite)، صفحات کاتالوگ، جزئیات محصول، جستجو و فیلتر، لیست علاقه‌مندی، تاریخچه، پیشنهادها
- `گزارش_پروژه.pdf` یا `REPORT.md` — گزارش پروژه (معماری، ابزارها، قابلیت‌ها، اسکرین‌شات)

## قابلیت‌های پیاده‌سازی شده

- نمایش محصولات (نام، تصویر، توضیحات، قیمت، دسته، موجودی، ویژگی‌ها)
- مرتب‌سازی و فیلتر (قیمت، محبوبیت، دسته، برند)
- مدیریت محصولات برای مدیر (افزودن، ویرایش، حذف، به‌روزرسانی موجودی/قیمت)
- جستجوی متنی و فیلتر ترکیبی
- علاقه‌مندی (Wishlist)
- تاریخچه مشاهده
- محصولات پیشنهادی
- دسته‌بندی چندسطحی
- صفحه جزئیات محصول با نظرات مشتریان
