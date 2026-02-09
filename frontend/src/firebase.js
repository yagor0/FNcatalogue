/**
 * Firebase (فرانت) — فقط برای Storage آپلود تصویر در ادمین
 * متغیرهای env در Vite: VITE_FIREBASE_* (در Netlify هم همان نام را تنظیم کنید)
 */
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fncatalogue.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fncatalogue',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'fncatalogue.appspot.com',
};

let app = null;
let storage = null;

function getStorageInstance() {
  if (!storage) {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
  }
  return storage;
}

/** آپلود فایل به Storage در پوشه products و برگرداندن لینک دانلود (همان URL در Firestore ذخیره می‌شود) */
export async function uploadProductImage(file) {
  const s = getStorageInstance();
  const name = `products/${Date.now()}-${(file.name || 'image').replace(/\s+/g, '-')}`;
  const storageRef = ref(s, name);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
