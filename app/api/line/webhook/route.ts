import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import { NextResponse } from "next/server";

import { adminDb } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINE_PROFILE_URL =
  "https://api.line.me/v2/bot/profile";

const CONVERSATIONS_COLLECTION =
  "lineConversations";

const CUSTOMERS_COLLECTION =
  "lineCustomers";

const MESSAGES_SUBCOLLECTION =
  "messages";

type SupportedLineMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "location"
  | "sticker"
  | "unknown";

interface LineWebhookBody {
  destination?: string;
  events?: LineWebhookEvent[];
}

interface LineWebhookEvent {
  type: string;
  mode?: "active" | "standby";
  timestamp?: number;
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery?: boolean;
  };
  source?: {
    type?: "user" | "group" | "room";
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: LineWebhookMessage;
}

interface LineWebhookMessage {
  id: string;
  type: string;

  text?: string;

  fileName?: string;
  fileSize?: number;

  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;

  packageId?: string;
  stickerId?: string;
  stickerResourceType?: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

interface NormalizedMessage {
  type: SupportedLineMessageType;
  preview: string;
  text?: string;
  fileName?: string;
  fileSize?: number;
  location?: {
    title?: string;
    address?: string;
    latitude: number;
    longitude: number;
  };
  sticker?: {
    packageId: string;
    stickerId: string;
    stickerResourceType?: string;
  };
}

/**
 * LINE ใช้ Channel Secret สร้าง HMAC-SHA256
 * จาก Request Body ดิบ แล้วส่งผลลัพธ์มาใน
 * Header ชื่อ x-line-signature
 */
function verifyLineSignature(
  rawBody: string,
  signature: string,
  channelSecret: string
): boolean {
  try {
    const expectedSignature = createHmac(
      "sha256",
      channelSecret
    )
      .update(rawBody)
      .digest("base64");

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );

    const receivedBuffer = Buffer.from(
      signature,
      "utf8"
    );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    );
  } catch (error) {
    console.error(
      "ตรวจสอบ LINE Signature ไม่สำเร็จ:",
      error
    );

    return false;
  }
}

/**
 * อ่าน Environment Variables ที่จำเป็น
 */
function getLineCredentials(): {
  channelSecret: string;
  channelAccessToken: string;
} {
  const channelSecret =
    process.env.LINE_CHANNEL_SECRET?.trim();

  const channelAccessToken =
    process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!channelSecret) {
    throw new Error(
      "ไม่พบ LINE_CHANNEL_SECRET ใน Environment Variables"
    );
  }

  if (!channelAccessToken) {
    throw new Error(
      "ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน Environment Variables"
    );
  }

  return {
    channelSecret,
    channelAccessToken,
  };
}

/**
 * อ่านโปรไฟล์ลูกค้าจาก LINE
 */
async function getLineProfile(
  lineUserId: string,
  channelAccessToken: string
): Promise<LineProfile | null> {
  try {
    const response = await fetch(
      `${LINE_PROFILE_URL}/${encodeURIComponent(
        lineUserId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${channelAccessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.warn(
        "ไม่สามารถอ่านโปรไฟล์ LINE ได้:",
        response.status,
        await response.text()
      );

      return null;
    }

    return (await response.json()) as LineProfile;
  } catch (error) {
    console.error(
      "เกิดข้อผิดพลาดขณะอ่านโปรไฟล์ LINE:",
      error
    );

    return null;
  }
}

/**
 * แปลงข้อความจาก LINE ให้อยู่ในรูปแบบ
 * ที่ LongTang Smart POS ใช้งาน
 */
function normalizeLineMessage(
  message: LineWebhookMessage
): NormalizedMessage {
  switch (message.type) {
    case "text":
      return {
        type: "text",
        text: message.text?.trim() || "",
        preview:
          message.text?.trim() || "ส่งข้อความ",
      };

    case "image":
      return {
        type: "image",
        preview: "ส่งรูปภาพ",
      };

    case "video":
      return {
        type: "video",
        preview: "ส่งวิดีโอ",
      };

    case "audio":
      return {
        type: "audio",
        preview: "ส่งข้อความเสียง",
      };

    case "file":
      return {
        type: "file",
        preview: message.fileName
          ? `ส่งไฟล์ ${message.fileName}`
          : "ส่งไฟล์",
        fileName: message.fileName,
        fileSize: message.fileSize,
      };

    case "location": {
      const latitude =
        typeof message.latitude === "number"
          ? message.latitude
          : 0;

      const longitude =
        typeof message.longitude === "number"
          ? message.longitude
          : 0;

      return {
        type: "location",
        preview:
          message.address?.trim() ||
          message.title?.trim() ||
          "ส่งตำแหน่งที่ตั้ง",
        location: {
          title: message.title,
          address: message.address,
          latitude,
          longitude,
        },
      };
    }

    case "sticker":
      return {
        type: "sticker",
        preview: "ส่งสติกเกอร์",
        sticker:
          message.packageId &&
          message.stickerId
            ? {
                packageId: message.packageId,
                stickerId: message.stickerId,
                stickerResourceType:
                  message.stickerResourceType,
              }
            : undefined,
      };

    default:
      return {
        type: "unknown",
        preview:
          "ส่งข้อความที่ระบบยังไม่รองรับ",
      };
  }
}

/**
 * ตรวจว่าข้อความเดิมเคยถูกบันทึกแล้วหรือไม่
 *
 * LINE อาจส่ง Webhook เดิมซ้ำได้ในกรณี Redelivery
 */
async function messageAlreadyExists(
  lineUserId: string,
  lineMessageId: string
): Promise<boolean> {
  const messageReference = adminDb
    .collection(CONVERSATIONS_COLLECTION)
    .doc(lineUserId)
    .collection(MESSAGES_SUBCOLLECTION)
    .doc(lineMessageId);

  const snapshot =
    await messageReference.get();

  return snapshot.exists;
}

/**
 * บันทึกข้อความที่ลูกค้าส่งเข้ามา
 */
async function saveIncomingMessage(
  lineUserId: string,
  message: LineWebhookMessage,
  normalizedMessage: NormalizedMessage,
  profile: LineProfile | null,
  event: LineWebhookEvent
): Promise<void> {
  if (
    await messageAlreadyExists(
      lineUserId,
      message.id
    )
  ) {
    console.log(
      "ข้าม Webhook ซ้ำ:",
      message.id
    );

    return;
  }

  const now = FieldValue.serverTimestamp();

  const displayName =
    profile?.displayName || "ลูกค้า LINE";

  const conversationReference = adminDb
    .collection(CONVERSATIONS_COLLECTION)
    .doc(lineUserId);

  const customerReference = adminDb
    .collection(CUSTOMERS_COLLECTION)
    .doc(lineUserId);

  /**
   * ใช้ LINE Message ID เป็น Firestore Document ID
   * ช่วยป้องกันการบันทึกข้อความซ้ำ
   */
  const messageReference =
    conversationReference
      .collection(MESSAGES_SUBCOLLECTION)
      .doc(message.id);

  await adminDb.runTransaction(
    async (transaction) => {
      const conversationSnapshot =
        await transaction.get(
          conversationReference
        );

      const conversationData =
        conversationSnapshot.data() as
          | DocumentData
          | undefined;

      const currentUnreadCount =
        typeof conversationData?.unreadCount ===
        "number"
          ? conversationData.unreadCount
          : 0;

      transaction.set(
        conversationReference,
        {
          lineUserId,
          displayName,
          pictureUrl:
            profile?.pictureUrl ?? null,
          lastMessage:
            normalizedMessage.preview,
          lastMessageType:
            normalizedMessage.type,
          lastMessageAt: now,
          unreadCount:
            currentUnreadCount + 1,
          archived: false,
          createdAt:
            conversationData?.createdAt ??
            now,
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(
        customerReference,
        {
          lineUserId,
          displayName,
          pictureUrl:
            profile?.pictureUrl ?? null,
          statusMessage:
            profile?.statusMessage ?? null,
          lastMessage:
            normalizedMessage.preview,
          lastMessageType:
            normalizedMessage.type,
          lastMessageAt: now,
          unreadCount:
            FieldValue.increment(1),
          isFriend: true,
          archived: false,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(messageReference, {
        lineUserId,
        lineMessageId: message.id,
        webhookEventId:
          event.webhookEventId ?? null,
        isRedelivery:
          event.deliveryContext
            ?.isRedelivery ?? false,
        direction: "incoming",
        type: normalizedMessage.type,
        text:
          normalizedMessage.text ?? null,
        contentUrl: null,
        fileName:
          normalizedMessage.fileName ?? null,
        fileSize:
          normalizedMessage.fileSize ?? null,
        location:
          normalizedMessage.location ?? null,
        sticker:
          normalizedMessage.sticker ?? null,
        status: "received",
        read: false,
        eventTimestamp:
          typeof event.timestamp === "number"
            ? event.timestamp
            : null,
        createdAt: now,
      });
    }
  );
}

/**
 * ประมวลผล Message Event แต่ละรายการ
 */
async function handleMessageEvent(
  event: LineWebhookEvent,
  channelAccessToken: string
): Promise<void> {
  const lineUserId =
    event.source?.userId?.trim();

  const message = event.message;

  if (!lineUserId || !message?.id) {
    console.warn(
      "ข้าม Message Event เพราะไม่พบ userId หรือ messageId"
    );

    return;
  }

  const normalizedMessage =
    normalizeLineMessage(message);

  const profile = await getLineProfile(
    lineUserId,
    channelAccessToken
  );

  await saveIncomingMessage(
    lineUserId,
    message,
    normalizedMessage,
    profile,
    event
  );
}

/**
 * LINE ใช้ POST สำหรับส่ง Webhook
 */
export async function POST(
  request: Request
): Promise<NextResponse> {
  try {
    const {
      channelSecret,
      channelAccessToken,
    } = getLineCredentials();

    /**
     * ต้องอ่าน Request Body เป็นข้อความดิบก่อน
     * ห้ามใช้ request.json() ก่อนตรวจ Signature
     */
    const rawBody = await request.text();

    const signature =
      request.headers.get(
        "x-line-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ไม่พบ x-line-signature",
        },
        {
          status: 401,
        }
      );
    }

    const validSignature =
      verifyLineSignature(
        rawBody,
        signature,
        channelSecret
      );

    if (!validSignature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "LINE Signature ไม่ถูกต้อง",
        },
        {
          status: 401,
        }
      );
    }

    let body: LineWebhookBody;

    try {
      body = JSON.parse(
        rawBody
      ) as LineWebhookBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "รูปแบบ JSON ไม่ถูกต้อง",
        },
        {
          status: 400,
        }
      );
    }

    const events = Array.isArray(body.events)
      ? body.events
      : [];

    /**
     * ตอนกด Verify ใน LINE Developers
     * อาจได้รับ Request ที่ไม่มี Event
     * ให้ตอบ 200 เพื่อยืนยันว่า Webhook ใช้งานได้
     */
    if (events.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message:
            "LINE Webhook พร้อมใช้งาน",
        },
        {
          status: 200,
        }
      );
    }

    const eventResults =
      await Promise.allSettled(
        events.map(async (event) => {
          if (
            event.type === "message" &&
            event.message
          ) {
            await handleMessageEvent(
              event,
              channelAccessToken
            );
          }
        })
      );

    const failedEvents =
      eventResults.filter(
        (result) =>
          result.status === "rejected"
      );

    failedEvents.forEach((result) => {
      if (
        result.status === "rejected"
      ) {
        console.error(
          "ประมวลผล LINE Event ไม่สำเร็จ:",
          result.reason
        );
      }
    });

    if (failedEvents.length > 0) {
      return NextResponse.json(
        {
          success: false,
          processed:
            events.length -
            failedEvents.length,
          failed: failedEvents.length,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        processed: events.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";

    console.error(
      "LINE Webhook Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * ใช้เปิด URL ในเบราว์เซอร์เพื่อตรวจว่า
 * Route ถูกสร้างสำเร็จหรือไม่
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    service:
      "LongTang Smart POS LINE Webhook",
    status: "ready",
  });
}