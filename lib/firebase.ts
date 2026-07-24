import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyA639SezpU6yH_MntNtwk77vX1oMdm6AQk",
  authDomain: "longtang-smart-pos.firebaseapp.com",
  projectId: "longtang-smart-pos",
  storageBucket: "longtang-smart-pos.firebasestorage.app",
  messagingSenderId: "487145698592",
  appId: "1:487145698592:web:4f8b03240f26fb727e9345",
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);