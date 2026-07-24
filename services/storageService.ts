const CLOUD_NAME = "zncmq8w7";
const UPLOAD_PRESET = "longtang_menu";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT = 60_000;

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

export async function uploadMenuImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("รูปมีขนาดใหญ่เกิน 5 MB กรุณาลดขนาดรูปก่อน");
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "longtang/menu-images");

  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, UPLOAD_TIMEOUT);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }
    );

    const data =
      (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
      throw new Error(
        data.error?.message || "อัปโหลดรูปไม่สำเร็จ"
      );
    }

    if (!data.secure_url) {
      throw new Error("ไม่ได้รับ URL รูปจาก Cloudinary");
    }

    return data.secure_url;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "อัปโหลดรูปนานเกิน 60 วินาที กรุณาลดขนาดรูปแล้วลองใหม่"
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function deleteMenuImage() {
  // การลบไฟล์ Cloudinary ต้องทำผ่านระบบฝั่งเซิร์ฟเวอร์ในภายหลัง
}