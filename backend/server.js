/**
 * Electronic Catalogue - REST API (Firebase Firestore)
 * Backend server for product catalog, categories, wishlist, view history
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import multer from 'multer';
import { initFirebase } from './firebase.js';
import * as fs from './firestore.js';
import { runSeed } from './initDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const isNetlify = !!process.env.NETLIFY;

// Multer: on Netlify use memory (no persistent disk); locally use disk
let upload;
if (isNetlify) {
  upload = multer({ storage: multer.memoryStorage() });
} else {
  const uploadDir = join(__dirname, '..', 'frontend', 'public', 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => cb(null, Date.now() + '-' + (file.originalname || 'image.jpg')),
    }),
  });
}

const origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.URL) origins.push(process.env.URL);
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
app.use(express.json());

function getSessionId(req) {
  return req.headers['x-session-id'] || req.body?.sessionId || 'guest';
}

// Wrapper so async route errors don't cause 502
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ----- Health (no Firebase) - برای چک کردن اینکه تابع Netlify لود شده -----
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    env: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'firebase-set' : 'firebase-missing',
  });
});

// ----- Categories -----
app.get('/api/categories', async (req, res) => {
  try {
    const withParent = req.query.tree === '1';
    if (withParent) {
      const rows = await fs.getCategoriesTree();
      return res.json(rows);
    }
    const rows = await fs.getCategoriesFlat();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ----- Products -----
app.get('/api/products', async (req, res) => {
  try {
    const { q, category, brand, minPrice, maxPrice, sort = 'newest', order = 'desc' } = req.query;
    const rows = await fs.getProducts({ q, category, brand, minPrice, maxPrice, sort, order });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const row = await fs.getProductById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.post('/api/products/:id/view', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    await fs.recordView(req.params.id, sessionId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ----- Wishlist -----
app.get('/api/wishlist', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const rows = await fs.getWishlist(sessionId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.post('/api/wishlist/:productId', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const result = await fs.addToWishlist(sessionId, req.params.productId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.delete('/api/wishlist/:productId', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    await fs.removeFromWishlist(sessionId, req.params.productId);
    res.json({ removed: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ----- View history -----
app.get('/api/history', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const rows = await fs.getHistory(sessionId, 20);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ----- Recommended -----
app.get('/api/recommended', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    const rows = await fs.getRecommended(limit);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ----- Reviews -----
app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { author, rating, comment } = req.body || {};
    await fs.addReview(req.params.id, { author, rating, comment });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ----- Admin: auth -----
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'نام کاربری و رمز عبور لازم است' });
    const row = await fs.getAdminByUsername(username);
    if (!row || row.password_hash !== String(password)) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    res.json({ token: 'admin-' + username, username });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'خطای سرور. یک بار npm run init-db را اجرا کنید.' });
  }
});

// ----- Admin: CRUD products -----
const requireAdmin = (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer admin-')) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const rows = await fs.adminGetProducts();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.post('/api/admin/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const image = (req.file && !isNetlify) ? '/uploads/' + req.file.filename : (body.image || '');
    let attributes = body.attributes;
    if (typeof attributes === 'string') try { attributes = JSON.parse(attributes); } catch (_) {}
    const slug = (body.slug || body.name || 'product').replace(/\s+/g, '-') + '-' + Date.now();
    const data = {
      name: body.name || 'محصول',
      slug,
      description: body.description || '',
      price: Number(body.price) || 0,
      stock: Number(body.stock) || 0,
      category_id: String(body.category_id || '1'),
      brand: body.brand || '',
      image,
      attributes: attributes || {},
    };
    const row = await fs.adminCreateProduct(data);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ایجاد محصول' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const current = await fs.getProductById(id);
    if (!current) return res.status(404).json({ error: 'Product not found' });
    const image = (req.file && !isNetlify) ? '/uploads/' + req.file.filename : (body.image !== undefined ? body.image : current.image);
    let attributes = body.attributes;
    if (typeof attributes === 'string') try { attributes = JSON.parse(attributes); } catch (_) { attributes = current.attributes; }
    const data = {
      name: body.name ?? current.name,
      description: body.description ?? current.description,
      price: body.price !== undefined ? Number(body.price) : current.price,
      stock: body.stock !== undefined ? Number(body.stock) : current.stock,
      category_id: body.category_id !== undefined ? String(body.category_id) : current.category_id,
      brand: body.brand ?? current.brand,
      image,
      attributes: typeof attributes === 'object' ? attributes : (attributes || current.attributes),
    };
    const row = await fs.adminUpdateProduct(id, data);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در بروزرسانی' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const ok = await fs.adminDeleteProduct(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف' });
  }
});

app.get('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const rows = await fs.getAdminCategories();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ----- Seed Firestore (once): فقط با secret از env (GET یا POST) -----
async function handleSeed(req, res) {
  const secret = process.env.SEED_SECRET;
  const given = req.query.secret || req.body?.secret;
  if (!secret || given !== secret) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const result = await runSeed();
    res.json(result);
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({
      error: 'خطای seed',
      message: err.message || String(err),
      hint: !process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'FIREBASE_SERVICE_ACCOUNT_JSON در Netlify تنظیم شده؟' : undefined,
    });
  }
}
app.get('/api/admin/seed', handleSeed);
app.post('/api/admin/seed', handleSeed);

// Global error handler - جلوگیری از 502 وقتی خطا از دست رفته
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'خطای سرور',
      message: err.message || String(err),
      hint: err.message && err.message.includes('FIREBASE') ? 'FIREBASE_SERVICE_ACCOUNT_JSON را در Netlify تنظیم کنید.' : undefined,
    });
  }
});

export { app };

async function start() {
  initFirebase();
  app.listen(PORT, () => console.log(`Electronic Catalogue API (Firebase) at http://localhost:${PORT}`));
}
if (!isNetlify) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
