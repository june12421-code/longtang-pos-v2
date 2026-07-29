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

const LINE_REPLY_URL =
  "https://api.line.me/v2/bot/message/reply";

const ORDER_URL =
  "https://longtang-pos-v2.vercel.app";

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
  replyToken?: string;

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
 * ย่อข้อความสำหรับใช้ใน Log
 * ป้องกันไม่ให้ข้อมูลหรือรหัสยาว ๆ แสดงเต็ม
 */
function maskValue(
  value: string | undefined,
  visibleLength = 6
): string {
  if (!value) {
    return "ไม่มี";
  }

  if (value.length <= visibleLength) {
    return "***";
  }

  return `${value.slice(
    0,
    visibleLength
  )}***`;
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
      console.warn(
        "[LINE WEBHOOK] Signature มีความยาวไม่ตรงกัน"
      );

      return false;
    }

    const signatureValid = timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    );

    console.log(
      "[LINE WEBHOOK] ผลตรวจ Signature:",
      signatureValid ? "ถูกต้อง" : "ไม่ถูกต้อง"
    );

    return signatureValid;
  } catch (error) {
    console.error(
      "[LINE WEBHOOK] ตรวจสอบ Signature ไม่สำเร็จ:",
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

  console.log(
    "[LINE WEBHOOK] ตรวจ Environment Variables:",
    {
      hasChannelSecret: Boolean(
        channelSecret
      ),
      hasChannelAccessToken: Boolean(
        channelAccessToken
      ),
    }
  );

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
  console.log(
    "[LINE PROFILE] เริ่มอ่านโปรไฟล์:",
    maskValue(lineUserId)
  );

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

    console.log(
      "[LINE PROFILE] สถานะการตอบกลับ:",
      response.status
    );

    if (!response.ok) {
      console.warn(
        "[LINE PROFILE] ไม่สามารถอ่านโปรไฟล์ได้:",
        response.status,
        await response.text()
      );

      return null;
    }

    const profile =
      (await response.json()) as LineProfile;

    console.log(
      "[LINE PROFILE] อ่านโปรไฟล์สำเร็จ:",
      {
        userId: maskValue(
          profile.userId
        ),
        displayName:
          profile.displayName,
      }
    );

    return profile;
  } catch (error) {
    console.error(
      "[LINE PROFILE] เกิดข้อผิดพลาด:",
      error
    );

    return null;
  }
}

/**
 * ส่งข้อความตอบกลับ LINE
 */
async function replyLineText(
  replyToken: string,
  text: string,
  channelAccessToken: string
): Promise<void> {
  console.log(
    "[LINE REPLY] กำลังส่งข้อความตอบกลับ:",
    {
      hasReplyToken: Boolean(
        replyToken
      ),
      replyTextLength: text.length,
      replyPreview:
        text.slice(0, 80),
    }
  );

  const response = await fetch(
    LINE_REPLY_URL,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${channelAccessToken}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "text",
            text,
          },
        ],
      }),
      cache: "no-store",
    }
  );

  console.log(
    "[LINE REPLY] สถานะจาก LINE API:",
    response.status
  );

  if (!response.ok) {
    const responseText =
      await response.text();

    console.error(
      "[LINE REPLY] ส่งข้อความไม่สำเร็จ:",
      {
        status: response.status,
        response: responseText,
      }
    );

    throw new Error(
      `ส่งข้อความตอบกลับ LINE ไม่สำเร็จ: ${response.status} ${responseText}`
    );
  }

  console.log(
    "[LINE REPLY] ส่งข้อความตอบกลับสำเร็จ"
  );
}

/**
 * สร้างข้อความตอบกลับตามข้อความลูกค้า
 */
function createReplyText(
  normalizedMessage: NormalizedMessage,
  displayName: string
): string {
  if (
    normalizedMessage.type === "text" &&
    normalizedMessage.text
  ) {
    const customerText =
      normalizedMessage.text
        .trim()
        .toLowerCase();

    if (
      customerText === "เมนู" ||
      customerText === "menu" ||
      customerText.includes("สั่งอาหาร")
    ) {
      return [
        `สวัสดีคุณ ${displayName} 👋`,
        "",
        "🍲 เมนูร้านหลงทั่ง",
        "• ชาบูเสียบไม้",
        "• หม่าล่าทั่ง",
        "• หม่าล่าทอด",
        "• หม่าล่าผัดแห้ง",
        "",
        "ไม้ละ 10 บาท",
        "มีบริการส่งฟรีรอบมหาวิทยาลัย",
        "",
        "กดสั่งอาหารได้ที่",
        ORDER_URL,
      ].join("\n");
    }

    if (
      customerText.includes("ติดตาม") ||
      customerText.includes("ออเดอร์") ||
      customerText.includes("คิว")
    ) {
      return [
        `สวัสดีคุณ ${displayName}`,
        "",
        "สามารถดูคิวส่งและติดตามออเดอร์ได้ที่",
        `${ORDER_URL}/track`,
        "",
        "กรุณาเตรียมเลขออเดอร์ของคุณไว้ด้วยนะคะ",
      ].join("\n");
    }

    return [
      `ได้รับข้อความของคุณ ${displayName} แล้วค่ะ 😊`,
      "",
      "พิมพ์คำว่า “เมนู”",
      "เพื่อดูรายการอาหารและสั่งอาหารออนไลน์",
    ].join("\n");
  }

  if (
    normalizedMessage.type === "image"
  ) {
    return [
      `ได้รับรูปภาพจากคุณ ${displayName} แล้วค่ะ 📷`,
      "ทางร้านจะตรวจสอบให้เร็วที่สุดนะคะ",
    ].join("\n");
  }

  if (
    normalizedMessage.type ===
    "location"
  ) {
    return [
      `ได้รับตำแหน่งจัดส่งจากคุณ ${displayName} แล้วค่ะ 📍`,
      "ทางร้านจะตรวจสอบสถานที่จัดส่งให้นะคะ",
    ].join("\n");
  }

  if (
    normalizedMessage.type ===
    "sticker"
  ) {
    return [
      `ขอบคุณสำหรับสติกเกอร์นะคะ ${displayName} 😊`,
      "พิมพ์คำว่า “เมนู” เพื่อสั่งอาหารได้เลยค่ะ",
    ].join("\n");
  }

  return [
    `ได้รับข้อมูลจากคุณ ${displayName} แล้วค่ะ`,
    "ทางร้านจะตรวจสอบให้เร็วที่สุดนะคะ",
  ].join("\n");
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
        text:
          message.text?.trim() || "",
        preview:
          message.text?.trim() ||
          "ส่งข้อความ",
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
        fileName:
          message.fileName,
        fileSize:
          message.fileSize,
      };

    case "location": {
      const latitude =
        typeof message.latitude ===
        "number"
          ? message.latitude
          : 0;

      const longitude =
        typeof message.longitude ===
        "number"
          ? message.longitude
          : 0;

      return {
        type: "location",
        preview:
          message.address?.trim() ||
          message.title?.trim() ||
          "ส่งตำแหน่งที่ตั้ง",
        location: {
          title:
            message.title,
          address:
            message.address,
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
                packageId:
                  message.packageId,
                stickerId:
                  message.stickerId,
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
 */
async function messageAlreadyExists(
  lineUserId: string,
  lineMessageId: string
): Promise<boolean> {
  console.log(
    "[FIRESTORE] ตรวจข้อความซ้ำ:",
    {
      userId:
        maskValue(lineUserId),
      messageId:
        maskValue(lineMessageId),
    }
  );

  const messageReference = adminDb
    .collection(
      CONVERSATIONS_COLLECTION
    )
    .doc(lineUserId)
    .collection(
      MESSAGES_SUBCOLLECTION
    )
    .doc(lineMessageId);

  const snapshot =
    await messageReference.get();

  console.log(
    "[FIRESTORE] ผลตรวจข้อความซ้ำ:",
    snapshot.exists
      ? "เคยบันทึกแล้ว"
      : "ยังไม่เคยบันทึก"
  );

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
): Promise<boolean> {
  console.log(
    "[FIRESTORE] เริ่มบันทึกข้อความ:",
    {
      userId:
        maskValue(lineUserId),
      messageId:
        maskValue(message.id),
      messageType:
        normalizedMessage.type,
      preview:
        normalizedMessage.preview.slice(
          0,
          80
        ),
    }
  );

  if (
    await messageAlreadyExists(
      lineUserId,
      message.id
    )
  ) {
    console.log(
      "[FIRESTORE] ข้าม Webhook ซ้ำ:",
      maskValue(message.id)
    );

    return false;
  }

  const now =
    FieldValue.serverTimestamp();

  const displayName =
    profile?.displayName ||
    "ลูกค้า LINE";

  const conversationReference =
    adminDb
      .collection(
        CONVERSATIONS_COLLECTION
      )
      .doc(lineUserId);

  const customerReference =
    adminDb
      .collection(
        CUSTOMERS_COLLECTION
      )
      .doc(lineUserId);

  const messageReference =
    conversationReference
      .collection(
        MESSAGES_SUBCOLLECTION
      )
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
        typeof conversationData
          ?.unreadCount === "number"
          ? conversationData.unreadCount
          : 0;

      transaction.set(
        conversationReference,
        {
          lineUserId,
          displayName,
          pictureUrl:
            profile?.pictureUrl ??
            null,
          lastMessage:
            normalizedMessage.preview,
          lastMessageType:
            normalizedMessage.type,
          lastMessageAt: now,
          unreadCount:
            currentUnreadCount + 1,
          archived: false,
          createdAt:
            conversationData
              ?.createdAt ?? now,
          updatedAt: now,
        },
        {
          merge: true,
        }
      );

      transaction.set(
        customerReference,
        {
          lineUserId,
          displayName,
          pictureUrl:
            profile?.pictureUrl ??
            null,
          statusMessage:
            profile?.statusMessage ??
            null,
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
        {
          merge: true,
        }
      );

      transaction.set(
        messageReference,
        {
          lineUserId,
          lineMessageId:
            message.id,
          webhookEventId:
            event.webhookEventId ??
            null,
          isRedelivery:
            event.deliveryContext
              ?.isRedelivery ??
            false,
          direction: "incoming",
          type:
            normalizedMessage.type,
          text:
            normalizedMessage.text ??
            null,
          contentUrl: null,
          fileName:
            normalizedMessage.fileName ??
            null,
          fileSize:
            normalizedMessage.fileSize ??
            null,
          location:
            normalizedMessage.location ??
            null,
          sticker:
            normalizedMessage.sticker ??
            null,
          status: "received",
          read: false,
          eventTimestamp:
            typeof event.timestamp ===
            "number"
              ? event.timestamp
              : null,
          createdAt: now,
        }
      );
    }
  );

  console.log(
    "[FIRESTORE] บันทึกข้อความสำเร็จ:",
    maskValue(message.id)
  );

  return true;
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

  const message =
    event.message;

  console.log(
    "[LINE EVENT] เริ่มประมวลผล Message Event:",
    {
      eventType:
        event.type,
      eventMode:
        event.mode ?? "ไม่มี",
      sourceType:
        event.source?.type ??
        "ไม่มี",
      userId:
        maskValue(lineUserId),
      messageId:
        maskValue(message?.id),
      messageType:
        message?.type ??
        "ไม่มี",
      hasReplyToken:
        Boolean(event.replyToken),
      isRedelivery:
        event.deliveryContext
          ?.isRedelivery ??
        false,
    }
  );

  if (
    !lineUserId ||
    !message?.id
  ) {
    console.warn(
      "[LINE EVENT] ข้าม Event เพราะไม่พบ userId หรือ messageId"
    );

    return;
  }

  const normalizedMessage =
    normalizeLineMessage(message);

  console.log(
    "[LINE EVENT] ข้อความหลัง Normalize:",
    {
      type:
        normalizedMessage.type,
      preview:
        normalizedMessage.preview.slice(
          0,
          80
        ),
    }
  );

  const profile =
    await getLineProfile(
      lineUserId,
      channelAccessToken
    );

  const messageSaved =
    await saveIncomingMessage(
      lineUserId,
      message,
      normalizedMessage,
      profile,
      event
    );

  if (!messageSaved) {
    console.log(
      "[LINE EVENT] ไม่ตอบกลับเพราะเป็นข้อความซ้ำ"
    );

    return;
  }

  const replyToken =
    event.replyToken?.trim();

  if (!replyToken) {
    console.warn(
      "[LINE EVENT] ไม่พบ replyToken จึงไม่สามารถตอบกลับได้"
    );

    return;
  }

  const displayName =
    profile?.displayName ||
    "ลูกค้า";

  const replyText =
    createReplyText(
      normalizedMessage,
      displayName
    );

  console.log(
    "[LINE EVENT] เตรียมตอบกลับ:",
    {
      displayName,
      replyLength:
        replyText.length,
    }
  );

  await replyLineText(
    replyToken,
    replyText,
    channelAccessToken
  );

  console.log(
    "[LINE EVENT] ประมวลผล Message Event สำเร็จ"
  );
}

/**
 * LINE ใช้ POST สำหรับส่ง Webhook
 */
export async function POST(
  request: Request
): Promise<NextResponse> {
  const requestStartedAt =
    Date.now();

  console.log(
    "========================================"
  );

  console.log(
    "[LINE WEBHOOK] ได้รับ POST Request ใหม่:",
    {
      timestamp:
        new Date().toISOString(),
      method:
        request.method,
      url:
        request.url,
      contentType:
        request.headers.get(
          "content-type"
        ),
      userAgent:
        request.headers.get(
          "user-agent"
        ),
      hasLineSignature:
        Boolean(
          request.headers.get(
            "x-line-signature"
          )
        ),
    }
  );

  try {
    const {
      channelSecret,
      channelAccessToken,
    } = getLineCredentials();

    /**
     * ต้องอ่าน Request Body เป็นข้อความดิบก่อน
     * ห้ามใช้ request.json() ก่อนตรวจ Signature
     */
    const rawBody =
      await request.text();

    console.log(
      "[LINE WEBHOOK] อ่าน Request Body สำเร็จ:",
      {
        bodyLength:
          rawBody.length,
        hasBody:
          rawBody.length > 0,
      }
    );

    const signature =
      request.headers.get(
        "x-line-signature"
      );

    if (!signature) {
      console.warn(
        "[LINE WEBHOOK] ไม่พบ x-line-signature"
      );

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
      console.warn(
        "[LINE WEBHOOK] ปฏิเสธ Request เพราะ Signature ไม่ถูกต้อง"
      );

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
    } catch (error) {
      console.error(
        "[LINE WEBHOOK] Parse JSON ไม่สำเร็จ:",
        error
      );

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

    const events =
      Array.isArray(body.events)
        ? body.events
        : [];

    console.log(
      "[LINE WEBHOOK] Parse Body สำเร็จ:",
      {
        destination:
          maskValue(
            body.destination
          ),
        eventCount:
          events.length,
      }
    );

    events.forEach(
      (event, index) => {
        console.log(
          `[LINE WEBHOOK] Event ลำดับที่ ${
            index + 1
          }:`,
          {
            type:
              event.type,
            mode:
              event.mode ??
              "ไม่มี",
            webhookEventId:
              maskValue(
                event.webhookEventId
              ),
            sourceType:
              event.source?.type ??
              "ไม่มี",
            userId:
              maskValue(
                event.source?.userId
              ),
            messageType:
              event.message?.type ??
              "ไม่มี",
            messageId:
              maskValue(
                event.message?.id
              ),
            hasReplyToken:
              Boolean(
                event.replyToken
              ),
            isRedelivery:
              event.deliveryContext
                ?.isRedelivery ??
              false,
          }
        );
      }
    );

    /**
     * ตอนกด Verify ใน LINE Developers
     * อาจได้รับ Request ที่ไม่มี Event
     */
    if (events.length === 0) {
      console.log(
        "[LINE WEBHOOK] ไม่มี Event — ตอบ 200 สำหรับ Verify"
      );

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
        events.map(
          async (
            event,
            index
          ) => {
            console.log(
              `[LINE WEBHOOK] เริ่ม Event ${
                index + 1
              }/${events.length}`
            );

            if (
              event.type ===
                "message" &&
              event.message
            ) {
              await handleMessageEvent(
                event,
                channelAccessToken
              );

              return;
            }

            console.log(
              "[LINE WEBHOOK] ข้าม Event ที่ไม่ใช่ Message:",
              event.type
            );
          }
        )
      );

    const failedEvents =
      eventResults.filter(
        (result) =>
          result.status ===
          "rejected"
      );

    failedEvents.forEach(
      (result, index) => {
        if (
          result.status ===
          "rejected"
        ) {
          console.error(
            `[LINE WEBHOOK] Event ล้มเหลวลำดับที่ ${
              index + 1
            }:`,
            result.reason
          );
        }
      }
    );

    const duration =
      Date.now() -
      requestStartedAt;

    if (
      failedEvents.length > 0
    ) {
      console.error(
        "[LINE WEBHOOK] ประมวลผลเสร็จแต่มี Event ล้มเหลว:",
        {
          total:
            events.length,
          processed:
            events.length -
            failedEvents.length,
          failed:
            failedEvents.length,
          durationMs:
            duration,
        }
      );

      return NextResponse.json(
        {
          success: false,
          processed:
            events.length -
            failedEvents.length,
          failed:
            failedEvents.length,
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "[LINE WEBHOOK] ประมวลผลทุก Event สำเร็จ:",
      {
        processed:
          events.length,
        durationMs:
          duration,
      }
    );

    return NextResponse.json(
      {
        success: true,
        processed:
          events.length,
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
      "[LINE WEBHOOK] Error หลัก:",
      error
    );

    console.error(
      "[LINE WEBHOOK] เวลาที่ใช้ก่อนเกิด Error:",
      `${Date.now() - requestStartedAt} ms`
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
  } finally {
    console.log(
      "[LINE WEBHOOK] จบการทำงานของ Request"
    );

    console.log(
      "========================================"
    );
  }
}

/**
 * ใช้เปิด URL ในเบราว์เซอร์เพื่อตรวจว่า
 * Route ถูกสร้างสำเร็จหรือไม่
 */
export async function GET(): Promise<NextResponse> {
  console.log(
    "[LINE WEBHOOK] มีการเรียก GET เพื่อตรวจสถานะ Route"
  );

  return NextResponse.json({
    success: true,
    service:
      "LongTang Smart POS LINE Webhook",
    status: "ready",
  });
}