import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../lib/firebase";

import type {
  LineChatMessage,
  LineConversation,
  LineCustomer,
  LineMessageDirection,
  LineMessageStatus,
  LineMessageType,
} from "../types/lineChat";

const CONVERSATIONS_COLLECTION = "lineConversations";
const CUSTOMERS_COLLECTION = "lineCustomers";
const MESSAGES_SUBCOLLECTION = "messages";

function mapConversationDocument(
  documentSnapshot: QueryDocumentSnapshot<DocumentData>
): LineConversation {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    lineUserId: data.lineUserId ?? documentSnapshot.id,
    displayName: data.displayName ?? "ลูกค้า LINE",
    pictureUrl: data.pictureUrl,
    lastMessage: data.lastMessage,
    lastMessageType: data.lastMessageType,
    lastMessageAt: data.lastMessageAt,
    unreadCount: data.unreadCount ?? 0,
    latestQueueNumber: data.latestQueueNumber,
    latestOrderId: data.latestOrderId,
    archived: data.archived ?? false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function mapMessageDocument(
  documentSnapshot: QueryDocumentSnapshot<DocumentData>
): LineChatMessage {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    lineUserId: data.lineUserId ?? "",
    lineMessageId: data.lineMessageId,
    direction: data.direction ?? "incoming",
    type: data.type ?? "unknown",
    text: data.text,
    contentUrl: data.contentUrl,
    fileName: data.fileName,
    fileSize: data.fileSize,
    location: data.location,
    sticker: data.sticker,
    status: data.status ?? "received",
    errorMessage: data.errorMessage,
    sentBy: data.sentBy,
    read: data.read ?? false,
    readAt: data.readAt,
    createdAt: data.createdAt,
  };
}

/**
 * ฟังรายชื่อห้องสนทนาแบบ Realtime
 */
export function subscribeToLineConversations(
  onData: (conversations: LineConversation[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const conversationsQuery = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("archived", "==", false),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs.map(mapConversationDocument);
      onData(conversations);
    },
    (error) => {
      console.error("ไม่สามารถอ่านรายการแชทได้:", error);
      onError?.(error);
    }
  );
}

/**
 * ฟังข้อความของลูกค้าแต่ละคนแบบ Realtime
 */
export function subscribeToLineMessages(
  lineUserId: string,
  onData: (messages: LineChatMessage[]) => void,
  onError?: (error: FirestoreError) => void,
  messageLimit = 100
): Unsubscribe {
  if (!lineUserId.trim()) {
    throw new Error("ไม่พบ LINE User ID");
  }

  const messagesQuery = query(
    collection(
      db,
      CONVERSATIONS_COLLECTION,
      lineUserId,
      MESSAGES_SUBCOLLECTION
    ),
    orderBy("createdAt", "asc"),
    limit(messageLimit)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map(mapMessageDocument);
      onData(messages);
    },
    (error) => {
      console.error("ไม่สามารถอ่านข้อความ LINE ได้:", error);
      onError?.(error);
    }
  );
}

interface SaveIncomingLineMessageInput {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  lineMessageId?: string;
  type: LineMessageType;
  text?: string;
  contentUrl?: string;
  fileName?: string;
  fileSize?: number;
  location?: LineChatMessage["location"];
  sticker?: LineChatMessage["sticker"];
}

/**
 * บันทึกข้อความที่ลูกค้าส่งเข้ามา
 */
export async function saveIncomingLineMessage(
  input: SaveIncomingLineMessageInput
): Promise<string> {
  const lineUserId = input.lineUserId.trim();

  if (!lineUserId) {
    throw new Error("ไม่พบ LINE User ID");
  }

  const conversationReference = doc(
    db,
    CONVERSATIONS_COLLECTION,
    lineUserId
  );

  const customerReference = doc(db, CUSTOMERS_COLLECTION, lineUserId);

  const messageCollectionReference = collection(
    db,
    CONVERSATIONS_COLLECTION,
    lineUserId,
    MESSAGES_SUBCOLLECTION
  );

  const messagePreview =
    input.text?.trim() ||
    getMessagePreview(input.type);

  await setDoc(
    conversationReference,
    {
      lineUserId,
      displayName: input.displayName || "ลูกค้า LINE",
      pictureUrl: input.pictureUrl ?? null,
      lastMessage: messagePreview,
      lastMessageType: input.type,
      lastMessageAt: serverTimestamp(),
      unreadCount: increment(1),
      archived: false,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
  customerReference,
  {
    lineUserId,
    displayName: input.displayName || "ลูกค้า LINE",
    pictureUrl: input.pictureUrl ?? null,
    statusMessage: input.statusMessage ?? null,
    lastMessage: messagePreview,
    lastMessageType: input.type,
    unreadCount: increment(1),
    isFriend: true,
    archived: false,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  },
  { merge: true }
);

  const messageReference = await addDoc(messageCollectionReference, {
    lineUserId,
    lineMessageId: input.lineMessageId ?? null,
    direction: "incoming" satisfies LineMessageDirection,
    type: input.type,
    text: input.text?.trim() || null,
    contentUrl: input.contentUrl ?? null,
    fileName: input.fileName ?? null,
    fileSize: input.fileSize ?? null,
    location: input.location ?? null,
    sticker: input.sticker ?? null,
    status: "received" satisfies LineMessageStatus,
    read: false,
    createdAt: serverTimestamp(),
  });

  return messageReference.id;
}

interface SaveOutgoingLineMessageInput {
  lineUserId: string;
  text: string;
  sentBy?: string;
  status?: Extract<LineMessageStatus, "sending" | "sent" | "failed">;
  errorMessage?: string;
}

/**
 * บันทึกข้อความที่ร้านส่งออกไป
 *
 * ฟังก์ชันนี้บันทึกเฉพาะใน Firestore
 * การส่งข้อความจริงไปยัง LINE จะทำใน lineService.ts
 */
export async function saveOutgoingLineMessage(
  input: SaveOutgoingLineMessageInput
): Promise<string> {
  const lineUserId = input.lineUserId.trim();
  const text = input.text.trim();

  if (!lineUserId) {
    throw new Error("ไม่พบ LINE User ID");
  }

  if (!text) {
    throw new Error("กรุณากรอกข้อความ");
  }

  const conversationReference = doc(
    db,
    CONVERSATIONS_COLLECTION,
    lineUserId
  );

  const messageCollectionReference = collection(
    db,
    CONVERSATIONS_COLLECTION,
    lineUserId,
    MESSAGES_SUBCOLLECTION
  );

  const messageReference = await addDoc(messageCollectionReference, {
    lineUserId,
    direction: "outgoing" satisfies LineMessageDirection,
    type: "text" satisfies LineMessageType,
    text,
    status: input.status ?? "sent",
    errorMessage: input.errorMessage ?? null,
    sentBy: input.sentBy ?? null,
    read: true,
    readAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  await setDoc(
    conversationReference,
    {
      lineUserId,
      lastMessage: text,
      lastMessageType: "text",
      lastMessageAt: serverTimestamp(),
      archived: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return messageReference.id;
}

/**
 * ทำเครื่องหมายว่าร้านอ่านข้อความทั้งหมดแล้ว
 */
export async function markConversationAsRead(
  lineUserId: string
): Promise<void> {
  const cleanLineUserId = lineUserId.trim();

  if (!cleanLineUserId) {
    throw new Error("ไม่พบ LINE User ID");
  }

  const unreadMessagesQuery = query(
    collection(
      db,
      CONVERSATIONS_COLLECTION,
      cleanLineUserId,
      MESSAGES_SUBCOLLECTION
    ),
    where("direction", "==", "incoming"),
    where("read", "==", false)
  );

  const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);

  const batch = writeBatch(db);

  unreadMessagesSnapshot.docs.forEach((messageDocument) => {
    batch.update(messageDocument.ref, {
      read: true,
      readAt: serverTimestamp(),
    });
  });

  const conversationReference = doc(
    db,
    CONVERSATIONS_COLLECTION,
    cleanLineUserId
  );

  batch.set(
    conversationReference,
    {
      unreadCount: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const customerReference = doc(
    db,
    CUSTOMERS_COLLECTION,
    cleanLineUserId
  );

  batch.set(
    customerReference,
    {
      unreadCount: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * ซ่อนหรือเปิดห้องสนทนา
 */
export async function setConversationArchived(
  lineUserId: string,
  archived: boolean
): Promise<void> {
  const cleanLineUserId = lineUserId.trim();

  if (!cleanLineUserId) {
    throw new Error("ไม่พบ LINE User ID");
  }

  const conversationReference = doc(
    db,
    CONVERSATIONS_COLLECTION,
    cleanLineUserId
  );

  const customerReference = doc(
    db,
    CUSTOMERS_COLLECTION,
    cleanLineUserId
  );

  const batch = writeBatch(db);

  batch.set(
    conversationReference,
    {
      archived,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(
    customerReference,
    {
      archived,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * อัปเดตการเชื่อมลูกค้า LINE กับออเดอร์ล่าสุด
 */
export async function linkLineCustomerToOrder(
  lineUserId: string,
  orderId: string,
  queueNumber?: string
): Promise<void> {
  const cleanLineUserId = lineUserId.trim();
  const cleanOrderId = orderId.trim();

  if (!cleanLineUserId) {
    throw new Error("ไม่พบ LINE User ID");
  }

  if (!cleanOrderId) {
    throw new Error("ไม่พบรหัสออเดอร์");
  }

  const conversationReference = doc(
    db,
    CONVERSATIONS_COLLECTION,
    cleanLineUserId
  );

  const customerReference = doc(
    db,
    CUSTOMERS_COLLECTION,
    cleanLineUserId
  );

  const updateData = {
    latestOrderId: cleanOrderId,
    latestQueueNumber: queueNumber?.trim() || null,
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);

  batch.set(conversationReference, updateData, { merge: true });
  batch.set(customerReference, updateData, { merge: true });

  await batch.commit();
}

/**
 * อัปเดตสถานะข้อความที่ร้านส่ง
 */
export async function updateOutgoingMessageStatus(
  lineUserId: string,
  messageId: string,
  status: Extract<LineMessageStatus, "sending" | "sent" | "failed">,
  errorMessage?: string
): Promise<void> {
  const messageReference = doc(
    db,
    CONVERSATIONS_COLLECTION,
    lineUserId,
    MESSAGES_SUBCOLLECTION,
    messageId
  );

  await updateDoc(messageReference, {
    status,
    errorMessage: errorMessage ?? null,
  });
}

function getMessagePreview(type: LineMessageType): string {
  switch (type) {
    case "image":
      return "ส่งรูปภาพ";

    case "video":
      return "ส่งวิดีโอ";

    case "audio":
      return "ส่งข้อความเสียง";

    case "file":
      return "ส่งไฟล์";

    case "location":
      return "ส่งตำแหน่งที่ตั้ง";

    case "sticker":
      return "ส่งสติกเกอร์";

    case "text":
      return "ส่งข้อความ";

    default:
      return "ส่งข้อความที่ระบบยังไม่รองรับ";
  }
}