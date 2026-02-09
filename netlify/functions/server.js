/**
 * Netlify Function: wraps Express API for FNcatalogue
 * روی Netlify از process.cwd() استفاده می‌کنیم (import.meta.url ممکن است undefined باشد)
 */
import serverless from 'serverless-http';
import { join } from 'path';
import { pathToFileURL } from 'url';

let wrapped = null;

async function getApp() {
  if (wrapped) return wrapped;
  const base = (typeof process.cwd === 'function' ? process.cwd() : null) || '/var/task';
  const paths = [
    join(base, 'backend', 'server.js'),
    join(base, 'netlify', 'functions', '..', '..', 'backend', 'server.js'),
  ].filter((p) => typeof p === 'string' && p.length > 0);
  let lastErr;
  for (const p of paths) {
    try {
      const { app } = await import(pathToFileURL(p).href);
      wrapped = serverless(app);
      return wrapped;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error('Backend load failed: ' + (lastErr?.message || lastErr));
}

export const handler = async (event, context) => {
  const path = event.path || event.rawUrl || '';
  if (path.includes('/api/health')) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        from: 'netlify-function',
        firebase_set: !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)),
      }),
    };
  }
  try {
    const handlerFn = await getApp();
    return await handlerFn(event, context);
  } catch (err) {
    console.error('Netlify function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'خطای سرور',
        message: err.message || String(err),
        hint: 'در Netlify متغیر FIREBASE_SERVICE_ACCOUNT_JSON را تنظیم کنید.',
      }),
    };
  }
};
