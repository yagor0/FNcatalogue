/**
 * Firestore data layer - replaces SQLite for FNcatalogue
 * Collections: categories, products, wishlist, view_history, reviews, admin_users
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

// ----- Categories -----
export async function getCategoriesFlat() {
  const snap = await db().collection(COLL.categories).orderBy('parent_id').orderBy('name').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

// ----- Products (with optional category join) -----
function productWithCategory(p, category) {
  return {
    ...p,
    id: p.id,
    category_name: category?.name,
    category_slug: category?.slug,
  };
}

export async function getProducts(filters = {}) {
  const { q, category, brand, minPrice, maxPrice, sort = 'newest', order = 'desc' } = filters;
  let ref = db().collection(COLL.products);

  const snap = await ref.get();
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (q) {
    const lower = q.toLowerCase();
    list = list.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(lower)) ||
        (p.description && p.description.toLowerCase().includes(lower))
    );
  }
  if (category) {
    const catId = String(category);
    list = list.filter((p) => p.category_id === catId || p.category_id === category);
  }
  if (brand) {
    const b = brand.toLowerCase();
    list = list.filter((p) => p.brand && p.brand.toLowerCase().includes(b));
  }
  if (minPrice != null && minPrice !== '') list = list.filter((p) => p.price >= Number(minPrice));
  if (maxPrice != null && maxPrice !== '') list = list.filter((p) => p.price <= Number(maxPrice));

  const sortCol = { price: 'price', popularity: 'popularity', newest: 'created_at', name: 'name' }[sort] || 'created_at';
  const dir = order === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    const va = a[sortCol] ?? 0;
    const vb = b[sortCol] ?? 0;
    if (typeof va === 'string') return dir * (va.localeCompare(vb));
    return dir * (va - vb);
  });

  const catSnap = await db().collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });

  return list.map((p) => productWithCategory(p, catsById[p.category_id]));
}

export async function getProductById(id) {
  const doc = await db().collection(COLL.products).doc(String(id)).get();
  if (!doc.exists) return null;
  const p = { id: doc.id, ...doc.data() };
  if (p.category_id) {
    const cat = await db().collection(COLL.categories).doc(String(p.category_id)).get();
    if (cat.exists) {
      p.category_name = cat.data().name;
      p.category_slug = cat.data().slug;
    }
  }
  const reviewsSnap = await db().collection(COLL.reviews).where('product_id', '==', String(id)).orderBy('created_at', 'desc').get();
  p.reviews = reviewsSnap.docs.map((d) => d.data());
  return p;
}

export async function recordView(productId, sessionId) {
  const id = String(productId);
  await db().collection(COLL.view_history).add({
    session_id: sessionId,
    product_id: id,
    viewed_at: FieldValue.serverTimestamp(),
  });
  const ref = db().collection(COLL.products).doc(id);
  await ref.update({ popularity: FieldValue.increment(1) });
}

// ----- Wishlist -----
export async function getWishlist(sessionId) {
  const snap = await db().collection(COLL.wishlist).where('session_id', '==', sessionId).orderBy('created_at', 'desc').get();
  const productIds = snap.docs.map((d) => d.data().product_id).filter(Boolean);
  if (productIds.length === 0) return [];
  const productsSnap = await db().collection(COLL.products).get();
  const byId = {};
  productsSnap.docs.forEach((d) => { byId[d.id] = { id: d.id, ...d.data() }; });
  const catSnap = await db().collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return productIds.map((pid) => productWithCategory(byId[pid] || { id: pid }, catsById[byId[pid]?.category_id])).filter((p) => p.name);
}

export async function addToWishlist(sessionId, productId) {
  const pid = String(productId);
  const existing = await db().collection(COLL.wishlist).where('session_id', '==', sessionId).where('product_id', '==', pid).limit(1).get();
  if (!existing.empty) return { added: false, already: true };
  await db().collection(COLL.wishlist).add({
    session_id: sessionId,
    product_id: pid,
    created_at: FieldValue.serverTimestamp(),
  });
  return { added: true };
}

export async function removeFromWishlist(sessionId, productId) {
  const pid = String(productId);
  const snap = await db().collection(COLL.wishlist).where('session_id', '==', sessionId).where('product_id', '==', pid).get();
  const batch = db().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return true;
}

// ----- View history -----
export async function getHistory(sessionId, limit = 20) {
  const snap = await db().collection(COLL.view_history).where('session_id', '==', sessionId).orderBy('viewed_at', 'desc').limit(limit).get();
  const seen = new Set();
  const productIds = [];
  snap.docs.forEach((d) => {
    const pid = d.data().product_id;
    if (!seen.has(pid)) {
      seen.add(pid);
      productIds.push(pid);
    }
  });
  if (productIds.length === 0) return [];
  const productsSnap = await db().collection(COLL.products).get();
  const byId = {};
  productsSnap.docs.forEach((d) => { byId[d.id] = { id: d.id, ...d.data(), viewed_at: null }; });
  snap.docs.forEach((d) => {
    const pid = d.data().product_id;
    if (byId[pid]) byId[pid].viewed_at = d.data().viewed_at;
  });
  const catSnap = await db().collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return productIds.map((pid) => productWithCategory(byId[pid] || { id: pid }, catsById[byId[pid]?.category_id])).filter((p) => p.name);
}

// ----- Recommended -----
export async function getRecommended(limit = 8) {
  const snap = await db().collection(COLL.products).orderBy('popularity', 'desc').orderBy('created_at', 'desc').limit(limit).get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const catSnap = await db().collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return list.map((p) => productWithCategory(p, catsById[p.category_id]));
}

// ----- Reviews -----
export async function addReview(productId, { author, rating, comment }) {
  await db().collection(COLL.reviews).add({
    product_id: String(productId),
    author: author || 'مهمان',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    comment: comment || '',
    created_at: FieldValue.serverTimestamp(),
  });
}

// ----- Admin -----
export async function getAdminByUsername(username) {
  const snap = await db().collection(COLL.admin_users).where('username', '==', String(username).trim()).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getAdminCategories() {
  const snap = await db().collection(COLL.categories).orderBy('parent_id').orderBy('name').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function adminGetProducts() {
  const snap = await db().collection(COLL.products).orderBy('created_at', 'desc').get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const catSnap = await db().collection(COLL.categories).get();
  const catsById = {};
  catSnap.docs.forEach((d) => { catsById[d.id] = d.data(); });
  return list.map((p) => productWithCategory(p, catsById[p.category_id]));
}

export async function adminCreateProduct(data) {
  const ref = await db().collection(COLL.products).add({
    ...data,
    popularity: 0,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

export async function adminUpdateProduct(id, data) {
  const ref = db().collection(COLL.products).doc(String(id));
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update({
    ...data,
    updated_at: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

export async function adminDeleteProduct(id) {
  const pid = String(id);
  const ref = db().collection(COLL.products).doc(pid);
  const doc = await ref.get();
  if (!doc.exists) return false;

  const batch = db().batch();
  batch.delete(ref);

  const wishlistSnap = await db().collection(COLL.wishlist).where('product_id', '==', pid).get();
  wishlistSnap.docs.forEach((d) => batch.delete(d.ref));
  const historySnap = await db().collection(COLL.view_history).where('product_id', '==', pid).get();
  historySnap.docs.forEach((d) => batch.delete(d.ref));
  const reviewsSnap = await db().collection(COLL.reviews).where('product_id', '==', pid).get();
  reviewsSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
  return true;
}
