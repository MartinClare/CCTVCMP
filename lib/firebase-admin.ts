import admin from "firebase-admin";

/**
 * Singleton Firebase Admin app.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var — a JSON string of the
 * service account credentials downloaded from Firebase Console.
 */
function getFirebaseApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. " +
        "Download your Firebase service account JSON and set it as this env var."
    );
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(raw);
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
