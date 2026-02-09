/**
 * Firebase Admin SDK - FNcatalogue
 * Supports: 1) Firestore Emulator (FIRESTORE_EMULATOR_HOST)  2) Real Firebase (service account)
 */
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const _firebaseDir = dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fncatalogue';
const USE_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

function getServiceAccountPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const names = [
    'firebase-service-account.json',
    'fncatalogue-firebase-adminsdk-fbsvc-f83dce6006.json',
  ];
  for (const name of names) {
    const p = join(_firebaseDir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

let initialized = false;

export function initFirebase() {
  if (initialized) return admin.app();

  if (USE_EMULATOR) {
    admin.initializeApp({ projectId: PROJECT_ID });
    console.log('Using Firestore Emulator at', process.env.FIRESTORE_EMULATOR_HOST);
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const pk = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');
    if (!pk.includes('BEGIN PRIVATE KEY')) {
      throw new Error('FIREBASE_PRIVATE_KEY باید شامل -----BEGIN PRIVATE KEY----- باشد.');
    }
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: pk,
        }),
      });
    } catch (e) {
      throw new Error('خطا در اتصال Firebase: ' + (e.message || String(e)));
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) jsonStr = jsonStr.slice(1, -1).replace(/\\"/g, '"');
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON باید یک JSON معتبر باشد. ' + (e.message || ''));
    }
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON باید فیلدهای client_email و private_key داشته باشد.');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    const path = getServiceAccountPath();
    if (!path) {
      throw new Error(
        'Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON (env), use Emulator, or place firebase-service-account.json in backend/.'
      );
    }
    const serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  initialized = true;
  return admin.app();
}

export function getFirestore() {
  if (!initialized) initFirebase();
  return admin.firestore();
}
