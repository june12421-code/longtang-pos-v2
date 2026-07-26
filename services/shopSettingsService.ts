import {
  doc,
  onSnapshot,
  serverTimestamp,
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

const shopSettingsReference = doc(
  db,
  "shopSettings",
  "main"
);

export async function updateShopSettings(
  settings: ShopSettings
): Promise<void> {
  await setDoc(
    shopSettingsReference,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}

export function subscribeShopSettings(
  callback: (settings: ShopSettings) => void
): () => void {
  return onSnapshot(
    shopSettingsReference,
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
        "ติดตามสถานะร้านไม่สำเร็จ:",
        error
      );

      callback(defaultShopSettings);
    }
  );
}