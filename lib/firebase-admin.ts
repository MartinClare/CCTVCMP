import admin from "firebase-admin";

/** True when server-side FCM is configured (JSON string of Firebase service account). */
export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

function getFirebaseApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set. Paste your Firebase service account JSON as this env var."
    );
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getMessaging(): admin.messaging.Messaging {
  return getFirebaseApp().messaging();
}
