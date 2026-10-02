const UPLOADCARE_PUBLIC_KEY = "a22d311b5b5eacc08997";

const UPLOADCARE_CDN_BASE =
  "https://5danwq15ld.ucarecd.net";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT = 60_000;

type UploadcareUploadResponse = {
  file?: string;
  error?: {
    content?: string;
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

  formData.append(
    "UPLOADCARE_PUB_KEY",
    UPLOADCARE_PUBLIC_KEY
  );
  formData.append("UPLOADCARE_STORE", "1");
  formData.append("file", file);

  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, UPLOAD_TIMEOUT);

  try {
    const response = await fetch(
      "https://upload.uploadcare.com/base/",
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }
    );

    let data: UploadcareUploadResponse;

    try {
      data =
        (await response.json()) as UploadcareUploadResponse;
    } catch {
      throw new Error(
        `Uploadcare ตอบกลับผิดปกติ (HTTP ${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error?.content ||
          `อัปโหลดรูปไม่สำเร็จ (HTTP ${response.status})`
      );
    }

    if (!data.file) {
      throw new Error(
        "อัปโหลดสำเร็จแต่ไม่ได้รับรหัสไฟล์"
      );
    }

    const encodedFileName = encodeURIComponent(file.name);

    return `${UPLOADCARE_CDN_BASE}/${data.file}/${encodedFileName}`;
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
        `ไม่สามารถเชื่อมต่อกับ Uploadcare ได้: ${error.message}`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function deleteMenuImage() {
  // ยังไม่ลบไฟล์จาก Uploadcare โดยตรง
  // เพราะการลบต้องใช้ Secret Key ฝั่ง Server
}