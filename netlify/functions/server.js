/**
 * Netlify Function: wraps Express API for FNcatalogue
 * All /api/* requests are redirected here by netlify.toml
 */
import serverless from 'serverless-http';
import { app } from '../../backend/server.js';

const wrapped = serverless(app);

export const handler = async (event, context) => {
  try {
    return await wrapped(event, context);
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
