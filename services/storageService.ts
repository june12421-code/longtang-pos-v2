const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT = 60_000;

type UploadResponse = {
  success?: boolean;
  url?: string;
  error?: string;
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

  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, UPLOAD_TIMEOUT);

  try {
    const response = await fetch(
      "/api/menu-image",
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }
    );

    let data: UploadResponse;

    try {
      data =
        (await response.json()) as UploadResponse;
    } catch {
      throw new Error(
        `ระบบอัปโหลดรูปตอบกลับผิดปกติ (HTTP ${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          `อัปโหลดรูปไม่สำเร็จ (HTTP ${response.status})`
      );
    }

    if (!data.url) {
      throw new Error(
        "อัปโหลดสำเร็จแต่ไม่ได้รับ URL รูปภาพ"
      );
    }

    return data.url;
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
        `ไม่สามารถเชื่อมต่อระบบอัปโหลดรูปได้: ${error.message}`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function deleteMenuImage() {
  // ยังไม่ลบไฟล์จาก Supabase Storage อัตโนมัติ
}