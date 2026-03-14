import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  // Support both GOOGLE_APPLICATION_CREDENTIALS (file path) and
  // inline service account JSON via FIREBASE_SERVICE_ACCOUNT_JSON env var.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  // Fallback: Application Default Credentials (ADC)
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
