export type ShopStatus =
  | "open"
  | "paused"
  | "closed";

export type ShopSettings = {
  status: ShopStatus;
  message: string;
};

type ShopSettingsResponse = {
  status?: ShopStatus;
  message?: string;
  error?: string;
};

const defaultShopSettings: ShopSettings = {
  status: "open",
  message: "",
};

export async function updateShopSettings(
  settings: ShopSettings
): Promise<void> {
  const response = await fetch(
    "/api/shop-settings",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    }
  );

  const result =
    (await response.json()) as ShopSettingsResponse;

  if (!response.ok) {
    throw new Error(
      result.error ||
        "บันทึกสถานะร้านไม่สำเร็จ"
    );
  }
}

async function getShopSettings(): Promise<ShopSettings> {
  const response = await fetch(
    "/api/shop-settings",
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const result =
    (await response.json()) as ShopSettingsResponse;

  if (!response.ok) {
    throw new Error(
      result.error ||
        "อ่านสถานะร้านไม่สำเร็จ"
    );
  }

  const status: ShopStatus =
    result.status === "paused" ||
    result.status === "closed"
      ? result.status
      : "open";

  return {
    status,
    message:
      typeof result.message === "string"
        ? result.message
        : "",
  };
}

export function subscribeShopSettings(
  callback: (settings: ShopSettings) => void
): () => void {
  let isActive = true;

  async function loadSettings() {
    try {
      const settings =
        await getShopSettings();

      if (isActive) {
        callback(settings);
      }
    } catch (error) {
      console.error(
        "ติดตามสถานะร้านไม่สำเร็จ:",
        error
      );

      if (isActive) {
        callback(defaultShopSettings);
      }
    }
  }

  loadSettings();

  const timer = window.setInterval(() => {
    loadSettings();
  }, 5000);

  return () => {
    isActive = false;
    window.clearInterval(timer);
  };
}