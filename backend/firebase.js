/**
 * Firebase Admin SDK - FNcatalogue
 * Supports: 1) Firestore Emulator (FIRESTORE_EMULATOR_HOST)  2) Real Firebase (service account)
 */
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    const p = join(__dirname, name);
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
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
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
