/**
 * Electronic Catalogue - REST API
 * Backend server for product catalog, categories, wishlist, view history
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import multer from 'multer';
import { openDb, createDbWrapper } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

let db;

// Multer for image uploads (store in public/uploads)
const uploadDir = join(__dirname, '..', 'frontend', 'public', 'uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + (file.originalname || 'image.jpg'))
});
const upload = multer({ storage });

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json());

// ----- Categories -----
app.get('/api/categories', (req, res) => {
  const withParent = req.query.tree === '1';
  const rows = db.prepare('SELECT * FROM categories ORDER BY COALESCE(parent_id,0), name').all();
  if (!withParent) return res.json(rows);
  const root = rows.filter(c => !c.parent_id);
  const byParent = {};
  rows.forEach(c => {
    if (!byParent[c.parent_id]) byParent[c.parent_id] = [];
    byParent[c.parent_id].push({ ...c, children: [] });
  });
  function build(nodes) {
    nodes.forEach(n => {
      n.children = byParent[n.id] || [];
      build(n.children);
    });
  }
  build(root);
  res.json(root);
});

// ----- Products -----
app.get('/api/products', (req, res) => {
  const { q, category, brand, minPrice, maxPrice, sort = 'newest', order = 'desc' } = req.query;
  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (q) {
    sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += ` AND (c.id = ? OR c.parent_id = ?)`;
    params.push(Number(category), Number(category));
  }
  if (brand) {
    sql += ` AND p.brand LIKE ?`;
    params.push(`%${brand}%`);
  }
  if (minPrice) {
    sql += ` AND p.price >= ?`;
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    sql += ` AND p.price <= ?`;
    params.push(Number(maxPrice));
  }
  const sortCol = { price: 'price', popularity: 'popularity', newest: 'created_at', name: 'name' }[sort] || 'created_at';
  sql += ` ORDER BY p.${sortCol} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Product not found' });
  const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC').all(row.id);
  res.json({ ...row, reviews });
});

// Record view (for history)
app.post('/api/products/:id/view', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.body?.sessionId || 'guest';
  const productId = Number(req.params.id);
  db.prepare('INSERT INTO view_history (session_id, product_id) VALUES (?, ?)').run(sessionId, productId);
  db.prepare('UPDATE products SET popularity = popularity + 1 WHERE id = ?').run(productId);
  res.json({ ok: true });
});

// ----- Wishlist -----
app.get('/api/wishlist', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId || 'guest';
  const rows = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM wishlist w
    JOIN products p ON w.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE w.session_id = ?
    ORDER BY w.created_at DESC
  `).all(sessionId);
  res.json(rows);
});

app.post('/api/wishlist/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.body?.sessionId || 'guest';
  const productId = Number(req.params.productId);
  try {
    db.prepare('INSERT INTO wishlist (session_id, product_id) VALUES (?, ?)').run(sessionId, productId);
    res.json({ added: true });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.json({ added: false, already: true });
    throw e;
  }
});

app.delete('/api/wishlist/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId || 'guest';
  db.prepare('DELETE FROM wishlist WHERE session_id = ? AND product_id = ?').run(sessionId, Number(req.params.productId));
  res.json({ removed: true });
});

// ----- View history -----
app.get('/api/history', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId || 'guest';
  const rows = db.prepare(`
    SELECT DISTINCT p.*, c.name as category_name, h.viewed_at
    FROM view_history h
    JOIN products p ON h.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE h.session_id = ?
    ORDER BY h.viewed_at DESC
    LIMIT 20
  `).all(sessionId);
  res.json(rows);
});

// ----- Recommended (by popularity and category) -----
app.get('/api/recommended', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 20);
  const rows = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.popularity DESC, p.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(rows);
});

// ----- Reviews -----
app.post('/api/products/:id/reviews', (req, res) => {
  const { author, rating, comment } = req.body || {};
  const productId = Number(req.params.id);
  db.prepare('INSERT INTO reviews (product_id, author, rating, comment) VALUES (?, ?, ?, ?)')
    .run(productId, author || 'مهمان', Math.min(5, Math.max(1, Number(rating) || 5)), comment || '');
  res.json({ ok: true });
});

// ----- Admin: auth (simple for demo) -----
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'نام کاربری و رمز عبور لازم است' });
    const row = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(String(username).trim());
    if (!row || row.password_hash !== String(password)) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    res.json({ token: 'admin-' + username, username });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'خطای سرور. احتمالاً دیتابیس مقداردهی نشده. یک بار از پوشه backend دستور npm run init-db را اجرا کنید.' });
  }
});

// ----- Admin: CRUD products -----
const requireAdmin = (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer admin-')) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

app.get('/api/admin/products', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id
  `).all();
  res.json(rows);
});

app.post('/api/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  const body = req.body || {};
  const image = req.file ? '/uploads/' + req.file.filename : (body.image || '');
  let attributes = body.attributes;
  if (typeof attributes === 'string') try { attributes = JSON.parse(attributes); } catch (_) {}
  const slug = (body.slug || body.name || 'product').replace(/\s+/g, '-') + '-' + Date.now();
  db.prepare(`
    INSERT INTO products (name, slug, description, price, stock, category_id, brand, image, popularity, attributes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    body.name || 'محصول',
    slug,
    body.description || '',
    Number(body.price) || 0,
    Number(body.stock) || 0,
    Number(body.category_id) || 1,
    body.brand || '',
    image,
    JSON.stringify(attributes || {})
  );
  const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
  res.status(201).json(row);
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Product not found' });
  const image = req.file ? '/uploads/' + req.file.filename : (body.image !== undefined ? body.image : current.image);
  let attributes = body.attributes;
  if (typeof attributes === 'string') try { attributes = JSON.parse(attributes); } catch (_) { attributes = current.attributes; }
  db.prepare(`
    UPDATE products SET
      name = ?, description = ?, price = ?, stock = ?, category_id = ?, brand = ?, image = ?, attributes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.name ?? current.name,
    body.description ?? current.description,
    body.price !== undefined ? Number(body.price) : current.price,
    body.stock !== undefined ? Number(body.stock) : current.stock,
    body.category_id !== undefined ? Number(body.category_id) : current.category_id,
    body.brand ?? current.brand,
    image,
    typeof attributes === 'object' ? JSON.stringify(attributes) : (attributes || current.attributes),
    id
  );
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  db.prepare('DELETE FROM wishlist WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM view_history WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM reviews WHERE product_id = ?').run(id);
  res.json({ deleted: true });
});

// ----- Admin: categories list (for dropdowns) -----
app.get('/api/admin/categories', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY parent_id, name').all());
});

const DEFAULT_PRODUCT_IMAGE = '/images/product-default.png';

async function start() {
  await openDb();
  db = createDbWrapper();
  try {
    db.prepare('UPDATE products SET image = ?').run(DEFAULT_PRODUCT_IMAGE);
  } catch (_) {}
  app.listen(PORT, () => console.log(`Electronic Catalogue API running at http://localhost:${PORT}`));
}
start().catch((err) => { console.error(err); process.exit(1); });
