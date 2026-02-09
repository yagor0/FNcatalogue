/**
 * Seed Firestore از API (با SEED_SECRET)
 */
import { initFirebase, getFirestore } from './firebase.js';

const COLL = { categories: 'categories', products: 'products', admin_users: 'admin_users' };
const productImage = '/images/product-default.png';

const categories = [
  { id: '1', name: 'لباس', slug: 'clothing', parent_id: null },
  { id: '2', name: 'مردانه', slug: 'mens', parent_id: '1' },
  { id: '3', name: 'زنانه', slug: 'womens', parent_id: '1' },
  { id: '4', name: 'پیراهن', slug: 'shirt', parent_id: '2' },
  { id: '5', name: 'شلوار', slug: 'pants', parent_id: '2' },
  { id: '6', name: 'لوازم الکترونیک', slug: 'electronics', parent_id: null },
  { id: '7', name: 'موبایل', slug: 'mobile', parent_id: '6' },
  { id: '8', name: 'لپ‌تاپ', slug: 'laptop', parent_id: '6' },
];

const products = [
  { name: 'پیراهن مردانه کلاسیک', slug: 'mens-classic-shirt', description: 'پیراهن مردانه با پارچه مرغوب.', price: 299000, stock: 50, category_id: '4', brand: 'برند الف', image: productImage, popularity: 120, attributes: { color: 'سفید', size: 'M' } },
  { name: 'شلوار جین مردانه', slug: 'mens-jeans', description: 'شلوار جین با کیفیت بالا.', price: 249000, stock: 30, category_id: '5', brand: 'برند ب', image: productImage, popularity: 95, attributes: { color: 'آبی', size: '32' } },
  { name: 'موبایل هوشمند X1', slug: 'mobile-x1', description: 'گوشی هوشمند با دوربین ۴۸ مگاپیکسل.', price: 8500000, stock: 20, category_id: '7', brand: 'سامسونگ', image: productImage, popularity: 200, attributes: { color: 'مشکی', storage: '128GB' } },
  { name: 'لپ‌تاپ ۱۵ اینچی', slug: 'laptop-15', description: 'لپ‌تاپ سبک با رم ۱۶ گیگابایت.', price: 25000000, stock: 10, category_id: '8', brand: 'ایسوس', image: productImage, popularity: 80, attributes: { color: 'نقره‌ای', ram: '16GB' } },
];

export async function runSeed() {
  await initFirebase();
  const firestore = await getFirestore();
  for (const c of categories) {
    const { id, ...data } = c;
    await firestore.collection(COLL.categories).doc(id).set(data);
  }
  for (const p of products) {
    await firestore.collection(COLL.products).add({ ...p, created_at: new Date(), updated_at: new Date() });
  }
  await firestore.collection(COLL.admin_users).doc('admin').set({ username: 'admin', password_hash: 'admin123' });
  return { ok: true, message: 'دیتابیس با دسته‌ها، محصولات و کاربر admin ساخته شد.' };
}
