import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

/**
 * แปลง Private Key ที่เก็บใน Environment Variables
 *
 * ตอนเก็บค่าใน .env.local หรือ Vercel
 * เครื่องหมายขึ้นบรรทัดใหม่จะถูกเก็บเป็น \n
 * จึงต้องแปลงกลับเป็นบรรทัดใหม่จริงก่อนใช้งาน
 */
function formatPrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

/**
 * ตรวจสอบ Environment Variables ที่ Firebase Admin ต้องใช้
 */
function getFirebaseAdminCredentials(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();

  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();

  const privateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();

  if (!projectId) {
    throw new Error(
      "ไม่พบ FIREBASE_ADMIN_PROJECT_ID ใน Environment Variables"
    );
  }

  if (!clientEmail) {
    throw new Error(
      "ไม่พบ FIREBASE_ADMIN_CLIENT_EMAIL ใน Environment Variables"
    );
  }

  if (!privateKey) {
    throw new Error(
      "ไม่พบ FIREBASE_ADMIN_PRIVATE_KEY ใน Environment Variables"
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: formatPrivateKey(privateKey),
  };
}

/**
 * สร้างหรืออ่าน Firebase Admin App เดิม
 *
 * การตรวจ getApps() ช่วยป้องกัน Error:
 * The default Firebase app already exists
 *
 * ซึ่งมักเกิดระหว่าง Next.js Hot Reload
 */
function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const credentials = getFirebaseAdminCredentials();

  return initializeApp({
    credential: cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
  });
}

/**
 * Firebase Admin App สำหรับใช้งานฝั่ง Server
 */
export const firebaseAdminApp = getFirebaseAdminApp();

/**
 * Firestore Admin
 *
 * ใช้เฉพาะใน:
 * - API Route
 * - LINE Webhook
 * - Server Action
 * - Server Component
 *
 * ห้าม import เข้า Client Component
 */
export const adminDb: Firestore =
  getFirestore(firebaseAdminApp);