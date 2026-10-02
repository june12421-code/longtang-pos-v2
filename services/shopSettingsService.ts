import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";

export type ShopStatus =
  | "open"
  | "paused"
  | "closed";

export type ShopSettings = {
  status: ShopStatus;
  message: string;
};

const defaultShopSettings: ShopSettings = {
  status: "open",
  message: "",
};

const shopSettingsRef = doc(
  db,
  "settings",
  "shop"
);

export async function updateShopSettings(
  settings: ShopSettings
): Promise<void> {
  await setDoc(
    shopSettingsRef,
    {
      status: settings.status,
      message: settings.message,
    },
    {
      merge: true,
    }
  );
}

export function subscribeShopSettings(
  callback: (settings: ShopSettings) => void
): () => void {
  const unsubscribe = onSnapshot(
    shopSettingsRef,

    (snapshot) => {
      if (!snapshot.exists()) {
        callback(defaultShopSettings);
        return;
      }

      const data = snapshot.data();

      const status: ShopStatus =
        data.status === "paused" ||
        data.status === "closed"
          ? data.status
          : "open";

      callback({
        status,
        message:
          typeof data.message === "string"
            ? data.message
            : "",
      });
    },

    (error) => {
      console.error(
        "ติดตามสถานะร้านจาก Firebase ไม่สำเร็จ:",
        error
      );

      callback(defaultShopSettings);
    }
  );

  return unsubscribe;
}