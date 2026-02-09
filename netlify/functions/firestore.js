/**
 * Firestore - همان لاجیک backend/firestore برای Netlify
 */
import { getFirestore } from './firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const db = () => getFirestore();

const COLL = {
  categories: 'categories',
  products: 'products',
  wishlist: 'wishlist',
  view_history: 'view_history',
  reviews: 'reviews',
  admin_users: 'admin_users',
};

function productWithCategory(p, category) {
  return { ...p, id: p.id, category_name: category?.name, category_slug: category?.slug };
}

export async function getCategoriesFlat() {
  const snap = await (await db()).collection(COLL.categories).get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.parent_id || '').localeCompare(b.parent_id || '') || (a.name || '').localeCompare(b.name || ''));
  return list;
}

export async function getCategoriesTree() {
  const rows = await getCategoriesFlat();
  const root = rows.filter((c) => !c.parent_id);
  const byParent = {};
  rows.forEach((c) => {
    const pid = c.parent_id || 'root';
    if (!byParent[pid]) byParent[pid] = [];
    byParent[pid].push({ ...c, children: [] });
  });
  function build(nodes) {
    nodes.forEach((n) => {
      n.children = byParent[n.id] || [];
      build(n.children);
    });
  }
  build(root);
  return root;
}

export async function getProducts(filters = {}) {
  const { q, category, brand, minPrice, maxPrice, sort = 'newest', order = 'desc' } = filters;
  const snap = await (await db()).collection(COLL.products).get();
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (q) {
    const lower = q.toLowerCase();
    list = list.filter((p) => (p.name && p.name.toLowerCase().includes(lower)) || (p.description && p.description.toLowerCase().includes(lower)));
  }
  if (category) list = list.filter((p) => p.category_id === String(category) || p.category_id === category);
  if (brand) list = list.filter((p) => p.brand && p.brand.toLowerCase().includes(String(brand).toLowerCase()));
  if (minPrice != null && minPrice !== '') list = list.filter((p) => p.price >= Number(minPrice));
  if (maxPrice != null && maxPrice !== '') list = list.filter((p) => p.price <= Number(maxPrice));
  const sortCol = { price: 'price', popularity: 'popularity', newest: 'created_at', name: 'name' }[sort] || 'created_at';
  const dir = order === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    const va = a[sortCol] ?? 0;
    const vb = b[sortCol] ?? 0;
    if (typeof va === 'string') return dir * va.localeCompare(vb);
    return dir * (va - vb);
  });
  const catSnap = await (await db()).collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return list.map((p) => productWithCategory(p, catsById[p.category_id]));
}

export async function getProductById(id) {
  const doc = await (await db()).collection(COLL.products).doc(String(id)).get();
  if (!doc.exists) return null;
  const p = { id: doc.id, ...doc.data() };
  if (p.category_id) {
    const cat = await (await db()).collection(COLL.categories).doc(String(p.category_id)).get();
    if (cat.exists) {
      p.category_name = cat.data().name;
      p.category_slug = cat.data().slug;
    }
  }
  const reviewsSnap = await (await db()).collection(COLL.reviews).where('product_id', '==', String(id)).get();
  const reviewsList = reviewsSnap.docs.map((d) => d.data());
  reviewsList.sort((a, b) => {
    const ta = a.created_at?.toMillis?.() ?? a.created_at?.getTime?.() ?? 0;
    const tb = b.created_at?.toMillis?.() ?? b.created_at?.getTime?.() ?? 0;
    return tb - ta;
  });
  p.reviews = reviewsList;
  return p;
}

export async function recordView(productId, sessionId) {
  await (await db()).collection(COLL.view_history).add({ session_id: sessionId, product_id: String(productId), viewed_at: FieldValue.serverTimestamp() });
  await (await db()).collection(COLL.products).doc(String(productId)).update({ popularity: FieldValue.increment(1) });
}

export async function getWishlist(sessionId) {
  const snap = await (await db()).collection(COLL.wishlist).where('session_id', '==', sessionId).get();
  const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id, _created: d.data().created_at })).filter((r) => r.product_id);
  rows.sort((a, b) => {
    const ta = a._created?.toMillis?.() ?? a._created?.getTime?.() ?? 0;
    const tb = b._created?.toMillis?.() ?? b._created?.getTime?.() ?? 0;
    return tb - ta;
  });
  const productIds = rows.map((r) => r.product_id);
  if (productIds.length === 0) return [];
  const productsSnap = await (await db()).collection(COLL.products).get();
  const byId = {};
  productsSnap.docs.forEach((d) => { byId[d.id] = { id: d.id, ...d.data() }; });
  const catSnap = await (await db()).collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return productIds.map((pid) => productWithCategory(byId[pid] || { id: pid }, catsById[byId[pid]?.category_id])).filter((p) => p.name);
}

export async function addToWishlist(sessionId, productId) {
  const pid = String(productId);
  const snap = await (await db()).collection(COLL.wishlist).where('session_id', '==', sessionId).get();
  const already = snap.docs.some((d) => d.data().product_id === pid);
  if (already) return { added: false, already: true };
  await (await db()).collection(COLL.wishlist).add({ session_id: sessionId, product_id: pid, created_at: FieldValue.serverTimestamp() });
  return { added: true };
}

export async function removeFromWishlist(sessionId, productId) {
  const pid = String(productId);
  const snap = await (await db()).collection(COLL.wishlist).where('session_id', '==', sessionId).get();
  const toDelete = snap.docs.filter((d) => d.data().product_id === pid);
  if (toDelete.length === 0) return true;
  const batch = (await db()).batch();
  toDelete.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return true;
}

export async function getHistory(sessionId, limit = 20) {
  const snap = await (await db()).collection(COLL.view_history).where('session_id', '==', sessionId).get();
  const rows = snap.docs.map((d) => ({ product_id: d.data().product_id, viewed_at: d.data().viewed_at })).filter((r) => r.product_id);
  rows.sort((a, b) => {
    const ta = a.viewed_at?.toMillis?.() ?? a.viewed_at?.getTime?.() ?? 0;
    const tb = b.viewed_at?.toMillis?.() ?? b.viewed_at?.getTime?.() ?? 0;
    return tb - ta;
  });
  const seen = new Set();
  const productIds = [];
  rows.forEach((r) => {
    if (!seen.has(r.product_id)) { seen.add(r.product_id); productIds.push(r.product_id); }
  });
  const limited = productIds.slice(0, limit);
  if (limited.length === 0) return [];
  const productsSnap = await (await db()).collection(COLL.products).get();
  const byId = {};
  productsSnap.docs.forEach((d) => { byId[d.id] = { id: d.id, ...d.data(), viewed_at: null }; });
  rows.forEach((r) => { if (byId[r.product_id]) byId[r.product_id].viewed_at = r.viewed_at; });
  const catSnap = await (await db()).collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return limited.map((pid) => productWithCategory(byId[pid] || { id: pid }, catsById[byId[pid]?.category_id])).filter((p) => p.name);
}

export async function getRecommended(limit = 8) {
  const snap = await (await db()).collection(COLL.products).get();
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ts = (o) => o?.toMillis?.() ?? o?.getTime?.() ?? (typeof o === 'number' ? o : 0);
  list.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || ts(b.created_at) - ts(a.created_at));
  list = list.slice(0, limit);
  const catSnap = await (await db()).collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return list.map((p) => productWithCategory(p, catsById[p.category_id]));
}

export async function addReview(productId, { author, rating, comment }) {
  await (await db()).collection(COLL.reviews).add({
    product_id: String(productId),
    author: author || 'مهمان',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    comment: comment || '',
    created_at: FieldValue.serverTimestamp(),
  });
}

export async function getAdminByUsername(username) {
  const snap = await (await db()).collection(COLL.admin_users).where('username', '==', String(username).trim()).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getAdminCategories() {
  return getCategoriesFlat();
}

export async function adminGetProducts() {
  const snap = await (await db()).collection(COLL.products).get();
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ts = (o) => o?.toMillis?.() ?? o?.getTime?.() ?? (typeof o === 'number' ? o : 0);
  list.sort((a, b) => ts(b.created_at) - ts(a.created_at));
  const catSnap = await (await db()).collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return list.map((p) => productWithCategory(p, catsById[p.category_id]));
}

export async function adminCreateProduct(data) {
  const ref = await (await db()).collection(COLL.products).add({
    ...data,
    popularity: 0,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

export async function adminUpdateProduct(id, data) {
  const ref = (await db()).collection(COLL.products).doc(String(id));
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update({ ...data, updated_at: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

export async function adminDeleteProduct(id) {
  const pid = String(id);
  const ref = (await db()).collection(COLL.products).doc(pid);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const batch = (await db()).batch();
  batch.delete(ref);
  const wishlistSnap = await (await db()).collection(COLL.wishlist).where('product_id', '==', pid).get();
  wishlistSnap.docs.forEach((d) => batch.delete(d.ref));
  const historySnap = await (await db()).collection(COLL.view_history).where('product_id', '==', pid).get();
  historySnap.docs.forEach((d) => batch.delete(d.ref));
  const reviewsSnap = await (await db()).collection(COLL.reviews).where('product_id', '==', pid).get();
  reviewsSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return true;
}
