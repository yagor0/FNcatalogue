/**
 * Netlify Function: wraps Express API for FNcatalogue
 * بارگذاری بک‌اند با مسیر نسبی به فایل تابع (هم cwd هم __dirname)
 */
import serverless from 'serverless-http';
import { join, dirname } from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const _fnDir = dirname(fileURLToPath(import.meta.url));

let wrapped = null;

async function getApp() {
  if (wrapped) return wrapped;
  const backendPath = join(_fnDir, '..', '..', 'backend', 'server.js');
  const { app } = await import(pathToFileURL(backendPath).href);
  wrapped = serverless(app);
  return wrapped;
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
        firebase_set: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
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
