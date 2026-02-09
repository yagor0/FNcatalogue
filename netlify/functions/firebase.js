/**
 * Firebase Admin برای Netlify - لود تنبل + الگوی سه‌متغیر یا JSON
 */
let admin = null;

async function loadAdmin() {
  if (!admin) admin = (await import('firebase-admin')).default;
  return admin;
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fncatalogue';
const USE_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

function getCert() {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) jsonStr = jsonStr.slice(1, -1).replace(/\\"/g, '"');
    const sa = JSON.parse(jsonStr);
    if (!sa.client_email || !sa.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON باید client_email و private_key داشته باشد.');
    return {
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: String(sa.private_key).replace(/\\n/g, '\n'),
    };
  }
  return null;
}

export async function initFirebase() {
  const a = await loadAdmin();
  if (a.apps.length) return a.app();

  if (USE_EMULATOR) {
    a.initializeApp({ projectId: PROJECT_ID });
  } else {
    const cert = getCert();
    if (!cert) throw new Error('در Netlify FIREBASE_SERVICE_ACCOUNT_JSON یا سه متغیر Firebase را تنظیم کنید.');
    a.initializeApp({
      credential: a.credential.cert(cert),
    });
  }
  return a.app();
}

export async function getFirestore() {
  const a = await loadAdmin();
  if (!a.apps.length) await initFirebase();
  return a.firestore();
}
