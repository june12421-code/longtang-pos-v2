import "server-only";

import type {
  SendLineMessageInput,
  SendLineMessageResult,
} from "../types/lineChat";

const LINE_PUSH_MESSAGE_URL =
  "https://api.line.me/v2/bot/message/push";

interface LineApiErrorResponse {
  message?: string;
  details?: Array<{
    message?: string;
    property?: string;
  }>;
}

interface LinePushMessageRequest {
  to: string;
  messages: Array<{
    type: "text";
    text: string;
  }>;
  notificationDisabled?: boolean;
}

/**
 * อ่าน LINE Channel Access Token จาก Environment Variables
 */
function getLineChannelAccessToken(): string {
  const accessToken =
    process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error(
      "ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน Environment Variables"
    );
  }

  return accessToken;
}

/**
 * ตรวจสอบ LINE User ID
 */
function validateLineUserId(lineUserId: string): string {
  const cleanLineUserId = lineUserId.trim();

  if (!cleanLineUserId) {
    throw new Error("ไม่พบ LINE User ID");
  }

  if (!cleanLineUserId.startsWith("U")) {
    throw new Error("รูปแบบ LINE User ID ไม่ถูกต้อง");
  }

  return cleanLineUserId;
}

/**
 * ตรวจสอบข้อความก่อนส่ง
 */
function validateLineText(text: string): string {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("กรุณากรอกข้อความ");
  }

  if (cleanText.length > 5000) {
    throw new Error(
      "ข้อความยาวเกินไป กรุณาใช้ไม่เกิน 5,000 ตัวอักษร"
    );
  }

  return cleanText;
}

/**
 * ส่งข้อความตัวหนังสือไปยังลูกค้าผ่าน LINE Messaging API
 */
export async function sendLineTextMessage(
  input: SendLineMessageInput
): Promise<SendLineMessageResult> {
  try {
    const accessToken = getLineChannelAccessToken();

    const lineUserId = validateLineUserId(
      input.lineUserId
    );

    const text = validateLineText(input.text);

    const requestBody: LinePushMessageRequest = {
      to: lineUserId,
      messages: [
        {
          type: "text",
          text,
        },
      ],
      notificationDisabled: false,
    };

    const response = await fetch(LINE_PUSH_MESSAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    if (!response.ok) {
      let errorMessage =
        `LINE API ตอบกลับด้วยสถานะ ${response.status}`;

      try {
        const errorData =
          (await response.json()) as LineApiErrorResponse;

        if (errorData.message) {
          errorMessage = errorData.message;
        }

        const detailMessages =
          errorData.details
            ?.map((detail) => detail.message)
            .filter(
              (message): message is string =>
                Boolean(message)
            ) ?? [];

        if (detailMessages.length > 0) {
          errorMessage += `: ${detailMessages.join(", ")}`;
        }
      } catch {
        const responseText = await response.text();

        if (responseText.trim()) {
          errorMessage = responseText;
        }
      }

      console.error(
        "ส่งข้อความ LINE ไม่สำเร็จ:",
        errorMessage
      );

      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";

    console.error(
      "เกิดข้อผิดพลาดระหว่างส่งข้อความ LINE:",
      error
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * ส่งข้อความแจ้งเลขคิว
 */
export async function sendQueueNotification(
  lineUserId: string,
  queueNumber: string,
  estimatedWaitMinutes?: number
): Promise<SendLineMessageResult> {
  const cleanQueueNumber = queueNumber.trim();

  if (!cleanQueueNumber) {
    return {
      success: false,
      error: "ไม่พบเลขคิว",
    };
  }

  const waitText =
    typeof estimatedWaitMinutes === "number" &&
    estimatedWaitMinutes > 0
      ? `\nเวลารอประมาณ ${estimatedWaitMinutes} นาที`
      : "";

  return sendLineTextMessage({
    lineUserId,
    text:
      `ร้านหลงทั่งรับออเดอร์แล้วค่ะ\n` +
      `เลขคิว ${cleanQueueNumber}` +
      waitText,
  });
}

/**
 * ส่งข้อความแจ้งว่าร้านกำลังทำอาหาร
 */
export async function sendPreparingNotification(
  lineUserId: string,
  queueNumber: string
): Promise<SendLineMessageResult> {
  return sendLineTextMessage({
    lineUserId,
    text:
      `คิว ${queueNumber.trim()}\n` +
      "ร้านกำลังจัดเตรียมอาหารให้อยู่นะคะ",
  });
}

/**
 * ส่งข้อความแจ้งว่าอาหารพร้อมแล้ว
 */
export async function sendReadyNotification(
  lineUserId: string,
  queueNumber: string
): Promise<SendLineMessageResult> {
  return sendLineTextMessage({
    lineUserId,
    text:
      `คิว ${queueNumber.trim()}\n` +
      "อาหารพร้อมแล้วค่ะ",
  });
}

/**
 * ส่งข้อความแจ้งว่าออเดอร์เสร็จสมบูรณ์
 */
export async function sendCompletedNotification(
  lineUserId: string,
  queueNumber: string
): Promise<SendLineMessageResult> {
  return sendLineTextMessage({
    lineUserId,
    text:
      `คิว ${queueNumber.trim()}\n` +
      "ออเดอร์เสร็จเรียบร้อยแล้วค่ะ\n" +
      "ขอบคุณที่อุดหนุนร้านหลงทั่งนะคะ",
  });
}