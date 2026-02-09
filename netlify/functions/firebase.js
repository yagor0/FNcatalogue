/**
 * Firebase Admin برای Netlify - لود تنبل تا کرش هنگام import نگیرد
 */
let admin = null;
let initialized = false;

async function loadAdmin() {
  if (!admin) admin = (await import('firebase-admin')).default;
  return admin;
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fncatalogue';
const USE_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

export async function initFirebase() {
  if (initialized) return (await loadAdmin()).app();
  const a = await loadAdmin();

  if (USE_EMULATOR) {
    a.initializeApp({ projectId: PROJECT_ID });
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const pk = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');
    a.initializeApp({
      credential: a.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pk,
      }),
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) jsonStr = jsonStr.slice(1, -1).replace(/\\"/g, '"');
    const serviceAccount = JSON.parse(jsonStr);
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON باید client_email و private_key داشته باشد.');
    }
    a.initializeApp({ credential: a.credential.cert(serviceAccount) });
  } else {
    throw new Error('در Netlify متغیر FIREBASE_SERVICE_ACCOUNT_JSON (یا سه متغیر Firebase) را تنظیم کنید.');
  }
  initialized = true;
  return a.app();
}

export async function getFirestore() {
  if (!initialized) await initFirebase();
  return (await loadAdmin()).firestore();
}
