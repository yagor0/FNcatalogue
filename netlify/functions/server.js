/**
 * Netlify Function: API با import ثابت از بک‌اند (همه‌چیز داخل باندل می‌رود، بدون مسیر رانتایم)
 */
import serverless from 'serverless-http';
import { app } from '../../backend/server.js';

export const handler = serverless(app);
