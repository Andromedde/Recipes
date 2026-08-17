import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let db = null;
let configLoaded = false;

async function loadConfig() {
  try {
    const mod = await import('./firebase-config.js');
    return mod;
  } catch {
    return null;
  }
}

export async function initFirebase() {
  const configMod = await loadConfig();
  if (!configMod || configMod.firebaseConfig.apiKey === 'YOUR_API_KEY') {
    return { ok: false, reason: 'config' };
  }

  const app = initializeApp(configMod.firebaseConfig);
  db = getFirestore(app);
  configLoaded = true;
  return { ok: true, collection: configMod.RECIPES_COLLECTION };
}

export function subscribeRecipes(collectionId, callback) {
  if (!db) {
    callback([], 'error');
    return () => {};
  }

  const docRef = doc(db, 'banks', collectionId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.recipes || [], 'connected');
      } else {
        callback([], 'connected');
      }
    },
    () => {
      callback([], 'error');
    }
  );
}

export async function saveRecipes(collectionId, recipes) {
  if (!db) throw new Error('Firebase не настроен');

  const docRef = doc(db, 'banks', collectionId);
  await setDoc(docRef, { recipes, updatedAt: Date.now() }, { merge: true });
}

export function isConfigLoaded() {
  return configLoaded;
}
