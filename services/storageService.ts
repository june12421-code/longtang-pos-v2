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

export async function uploadMenuImage(
  file: File
): Promise<string> {
  if (!file) {
    throw new Error("ไม่พบไฟล์รูปภาพ");
  }

  if (file.size === 0) {
    throw new Error("ไฟล์รูปภาพมีขนาด 0 bytes");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `รูปมีขนาด ${(file.size / 1024 / 1024).toFixed(
        2
      )} MB ซึ่งใหญ่เกิน 5 MB`
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "upload_preset",
    UPLOAD_PRESET
  );
  formData.append(
    "folder",
    "longtang/menu-images"
  );

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

    let data: CloudinaryUploadResponse;

    try {
      data =
        (await response.json()) as CloudinaryUploadResponse;
    } catch {
      throw new Error(
        `Cloudinary ตอบกลับผิดปกติ (HTTP ${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
          `อัปโหลดรูปไม่สำเร็จ (HTTP ${response.status})`
      );
    }

    if (!data.secure_url) {
      throw new Error(
        "อัปโหลดสำเร็จแต่ไม่ได้รับ URL รูปภาพ"
      );
    }

    return data.secure_url;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "อัปโหลดรูปนานเกิน 60 วินาที กรุณาลองใหม่หรือลดขนาดรูป"
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `ไม่สามารถเชื่อมต่อกับ Cloudinary ได้: ${error.message}`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function deleteMenuImage() {
  // การลบรูปจะทำผ่าน Server API ในภายหลัง
}