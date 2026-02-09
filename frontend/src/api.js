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

export async function getCategories(tree = false) {
  const res = await fetch(API + '/categories' + (tree ? '?tree=1' : ''));
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getProducts(params = {}) {
  const u = new URLSearchParams(params);
  const res = await fetch(API + '/products?' + u);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProduct(id) {
  const res = await fetch(API + '/products/' + id);
  if (!res.ok) throw new Error('Failed to fetch product');
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
  if (!res.ok) throw new Error('Failed to fetch wishlist');
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
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function getRecommended(limit = 8) {
  const res = await fetch(API + '/recommended?limit=' + limit);
  if (!res.ok) throw new Error('Failed to fetch recommended');
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
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function adminGetCategories() {
  const res = await fetch(API + '/admin/categories', { headers: adminHeaders() });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
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
