/**
 * API سرور برای Netlify - همه‌چیز داخل همین پوشه، بدون وابستگی به backend/
 */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import serverless from 'serverless-http';
import { initFirebase, getStorageBucket } from './firebase.js';
import * as fs from './firestore.js';
import { runSeed } from './seed.js';

const upload = multer({ storage: multer.memoryStorage() });

/** آپلود تصویر به Firebase Storage و برگرداندن URL عمومی */
async function uploadProductImageToStorage(file) {
  if (!file || !file.buffer) return null;
  const bucket = await getStorageBucket();
  const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
  const name = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const bucketFile = bucket.file(name);
  await bucketFile.save(file.buffer, {
    metadata: { contentType: file.mimetype || 'image/jpeg' },
  });
  return `https://storage.googleapis.com/${bucket.name}/${name}`;
}
const app = express();

const origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.URL) origins.push(process.env.URL);
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
app.use(express.json());

function getSessionId(req) {
  return req.headers['x-session-id'] || req.body?.sessionId || 'guest';
}

function safeErrMessage(err) {
  const msg = (err && (err.message || String(err))) || '';
  return msg.slice(0, 300).replace(/[^\w\u0600-\u06FF\s\-:.]/g, ' ');
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    from: 'netlify-function',
    firebase_set: !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)),
  });
});

app.get('/api/categories', async (req, res) => {
  try {
    if (req.query.tree === '1') {
      const rows = await fs.getCategoriesTree();
      return res.json(rows);
    }
    const rows = await fs.getCategoriesFlat();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { q, category, brand, minPrice, maxPrice, sort = 'newest', order = 'desc' } = req.query;
    const rows = await fs.getProducts({ q, category, brand, minPrice, maxPrice, sort, order });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const row = await fs.getProductById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.post('/api/products/:id/view', async (req, res) => {
  try {
    await fs.recordView(req.params.id, getSessionId(req));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.get('/api/wishlist', async (req, res) => {
  try {
    const rows = await fs.getWishlist(getSessionId(req));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.post('/api/wishlist/:productId', async (req, res) => {
  try {
    const result = await fs.addToWishlist(getSessionId(req), req.params.productId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.delete('/api/wishlist/:productId', async (req, res) => {
  try {
    await fs.removeFromWishlist(getSessionId(req), req.params.productId);
    res.json({ removed: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const rows = await fs.getHistory(getSessionId(req), 20);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.get('/api/recommended', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    const rows = await fs.getRecommended(limit);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { author, rating, comment } = req.body || {};
    await fs.addReview(req.params.id, { author, rating, comment });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'نام کاربری و رمز عبور لازم است' });
    const row = await fs.getAdminByUsername(username);
    if (!row || row.password_hash !== String(password)) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    res.json({ token: 'admin-' + username, username });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

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
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

app.post('/api/admin/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    let image = body.image || '';
    if (req.file && req.file.buffer) {
      const url = await uploadProductImageToStorage(req.file);
      if (url) image = url;
    }
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
    res.status(500).json({ error: 'خطا در ایجاد محصول', message: safeErrMessage(err) });
  }
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const current = await fs.getProductById(id);
    if (!current) return res.status(404).json({ error: 'Product not found' });
    let image = body.image !== undefined ? body.image : current.image;
    if (req.file && req.file.buffer) {
      const url = await uploadProductImageToStorage(req.file);
      if (url) image = url;
    }
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
    res.status(500).json({ error: 'خطا در بروزرسانی', message: safeErrMessage(err) });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const ok = await fs.adminDeleteProduct(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف', message: safeErrMessage(err) });
  }
});

app.get('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const rows = await fs.getAdminCategories();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور', message: safeErrMessage(err) });
  }
});

async function handleSeed(req, res) {
  const secret = process.env.SEED_SECRET;
  const given = req.query.secret || req.body?.secret;
  if (!secret || given !== secret) return res.status(404).json({ error: 'Not found' });
  try {
    const result = await runSeed();
    res.json(result);
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'خطای seed', message: safeErrMessage(err) });
  }
}
app.get('/api/admin/seed', handleSeed);
app.post('/api/admin/seed', handleSeed);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'خطای سرور', message: err.message || String(err) });
  }
});

const serverlessHandler = serverless(app);

export const handler = async (event, context) => {
  try {
    return await serverlessHandler(event, context);
  } catch (err) {
    console.error('Function crash prevented:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'خطای سرور',
        message: (err && (err.message || String(err))) || 'Unknown error',
        hint: 'Check Netlify function logs and FIREBASE_SERVICE_ACCOUNT_JSON.',
      }),
    };
  }
};
