/**
 * Netlify Function: wraps Express API for FNcatalogue
 * All /api/* requests are redirected here by netlify.toml
 */
import serverless from 'serverless-http';
import { app } from '../../backend/server.js';

export const handler = serverless(app);
