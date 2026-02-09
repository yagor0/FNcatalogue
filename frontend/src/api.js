/**
 * API client for Electronic Catalogue backend
 */
const API = '/api';

function getSessionId() {
  let id = localStorage.getItem('catalogue_session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem('catalogue_session_id', id);
  }
  return id;
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Session-Id': getSessionId(),
});

async function throwIfNotOk(res, defaultMsg) {
  if (res.ok) return;
  let msg = defaultMsg;
  try {
    const data = await res.json();
    if (data.message) msg = data.message;
    else if (data.error) msg = data.error;
  } catch (_) {}
  throw new Error(msg);
}

export async function getCategories(tree = false) {
  const res = await fetch(API + '/categories' + (tree ? '?tree=1' : ''));
  await throwIfNotOk(res, 'خطا در بارگذاری دسته‌ها');
  return res.json();
}

export async function getProducts(params = {}) {
  const u = new URLSearchParams(params);
  const res = await fetch(API + '/products?' + u);
  await throwIfNotOk(res, 'خطا در بارگذاری محصولات');
  return res.json();
}

export async function getProduct(id) {
  const res = await fetch(API + '/products/' + id);
  await throwIfNotOk(res, 'خطا در بارگذاری محصول');
  return res.json();
}

export async function recordView(productId) {
  await fetch(API + '/products/' + productId + '/view', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ sessionId: getSessionId() }),
  });
}

export async function getWishlist() {
  const res = await fetch(API + '/wishlist', { headers: headers() });
  await throwIfNotOk(res, 'خطا در بارگذاری لیست علاقه‌مندی');
  return res.json();
}

export async function addToWishlist(productId) {
  const res = await fetch(API + '/wishlist/' + productId, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ sessionId: getSessionId() }),
  });
  return res.json();
}

export async function removeFromWishlist(productId) {
  await fetch(API + '/wishlist/' + productId, {
    method: 'DELETE',
    headers: { 'X-Session-Id': getSessionId() },
  });
}

export async function getHistory() {
  const res = await fetch(API + '/history', { headers: headers() });
  await throwIfNotOk(res, 'خطا در بارگذاری تاریخچه');
  return res.json();
}

export async function getRecommended(limit = 8) {
  const res = await fetch(API + '/recommended?limit=' + limit);
  await throwIfNotOk(res, 'خطا در بارگذاری پیشنهادها');
  return res.json();
}

export async function submitReview(productId, { author, rating, comment }) {
  await fetch(API + '/products/' + productId + '/reviews', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ author, rating, comment }),
  });
}

// Admin
export async function adminLogin(username, password) {
  const res = await fetch(API + '/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ورود ناموفق');
  return data;
}

function adminHeaders() {
  const token = localStorage.getItem('admin_token');
  return { ...headers(), Authorization: 'Bearer ' + token };
}

export async function adminGetProducts() {
  const res = await fetch(API + '/admin/products', { headers: adminHeaders() });
  if (!res.ok) throw new Error('لطفاً دوباره وارد شوید');
  return res.json();
}

export async function adminGetCategories() {
  const res = await fetch(API + '/admin/categories', { headers: adminHeaders() });
  if (!res.ok) throw new Error('لطفاً دوباره وارد شوید');
  return res.json();
}

export async function adminCreateCategory(data) {
  const res = await fetch(API + '/admin/categories', {
    method: 'POST',
    headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('خطا در ایجاد دسته');
  return res.json();
}

export async function adminUpdateCategory(id, data) {
  const res = await fetch(API + '/admin/categories/' + id, {
    method: 'PUT',
    headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('خطا در بروزرسانی دسته');
  return res.json();
}

export async function adminDeleteCategory(id) {
  const res = await fetch(API + '/admin/categories/' + id, { method: 'DELETE', headers: adminHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'خطا در حذف دسته');
  }
  return res.json();
}

/** آپلود تصویر به ImgBB؛ برگرداندن URL مستقیم تصویر برای ذخیره در Firestore */
export async function uploadImageToImgBB(file) {
  const key = import.meta.env.VITE_IMGBB_KEY || 'bbc29d0bf7f2de21f0b6d24fee067b47';
  if (!key) throw new Error('کلید ImgBB (VITE_IMGBB_KEY) تنظیم نشده است.');
  const base64 = await fileToBase64(file);
  const form = new URLSearchParams();
  form.set('key', key);
  form.set('image', base64);
  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success || !data.data?.image?.url) throw new Error(data.error?.message || 'آپلود به ImgBB ناموفق');
  return data.data.image.url;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result;
      resolve(s.indexOf(',') >= 0 ? s.split(',')[1] : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function adminCreateProduct(formData) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(API + '/admin/products', {
    method: 'POST',
    headers: { 'X-Session-Id': getSessionId(), Authorization: 'Bearer ' + token },
    body: formData,
  });
  if (!res.ok) throw new Error('خطا در ایجاد محصول');
  return res.json();
}

export async function adminUpdateProduct(id, formData) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(API + '/admin/products/' + id, {
    method: 'PUT',
    headers: { 'X-Session-Id': getSessionId(), Authorization: 'Bearer ' + token },
    body: formData,
  });
  if (!res.ok) throw new Error('خطا در بروزرسانی');
  return res.json();
}

export async function adminDeleteProduct(id) {
  const res = await fetch(API + '/admin/products/' + id, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error('خطا در حذف');
  return res.json();
}
