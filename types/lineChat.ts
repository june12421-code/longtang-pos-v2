import type { Timestamp } from "firebase/firestore";

/**
 * ประเภทของข้อความที่ระบบ LongTang Smart POS รองรับ
 */
export type LineMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "location"
  | "sticker"
  | "unknown";

/**
 * ทิศทางของข้อความ
 *
 * incoming = ลูกค้าส่งเข้ามา
 * outgoing = ร้านส่งกลับไปหาลูกค้า
 */
export type LineMessageDirection = "incoming" | "outgoing";

/**
 * สถานะการส่งข้อความจากร้าน
 */
export type LineMessageStatus =
  | "received"
  | "sending"
  | "sent"
  | "failed";

/**
 * ข้อมูลลูกค้าที่ติดต่อผ่าน LINE Official Account
 */
export interface LineCustomer {
  /**
   * LINE User ID ของลูกค้า
   */
  lineUserId: string;

  /**
   * ชื่อที่แสดงใน LINE
   */
  displayName: string;

  /**
   * URL รูปโปรไฟล์ LINE
   */
  pictureUrl?: string;

  /**
   * ข้อความสถานะใน LINE
   */
  statusMessage?: string;

  /**
   * เบอร์โทรที่ลูกค้าแจ้งกับร้าน
   */
  phone?: string;

  /**
   * รหัสลูกค้าในระบบ LongTang Smart POS
   */
  customerId?: string;

  /**
   * รหัสออเดอร์ล่าสุด
   */
  latestOrderId?: string;

  /**
   * เลขคิวล่าสุด เช่น A001
   */
  latestQueueNumber?: string;

  /**
   * ข้อความล่าสุดในห้องสนทนา
   */
  lastMessage?: string;

  /**
   * ประเภทข้อความล่าสุด
   */
  lastMessageType?: LineMessageType;

  /**
   * เวลาที่มีข้อความล่าสุด
   */
  lastMessageAt?: Timestamp;

  /**
   * จำนวนข้อความที่ร้านยังไม่ได้อ่าน
   */
  unreadCount: number;

  /**
   * ลูกค้ายังเป็นเพื่อนกับ LINE OA หรือไม่
   */
  isFriend: boolean;

  /**
   * ปิดการแสดงห้องสนทนาหรือไม่
   */
  archived: boolean;

  /**
   * เวลาที่สร้างข้อมูลลูกค้า
   */
  createdAt?: Timestamp;

  /**
   * เวลาที่แก้ไขข้อมูลล่าสุด
   */
  updatedAt?: Timestamp;
}

/**
 * ข้อมูลตำแหน่งที่ลูกค้าส่งผ่าน LINE
 */
export interface LineLocationData {
  title?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

/**
 * ข้อมูลสติกเกอร์ LINE
 */
export interface LineStickerData {
  packageId: string;
  stickerId: string;
  stickerResourceType?: string;
}

/**
 * ข้อความในห้องสนทนา LINE
 */
export interface LineChatMessage {
  /**
   * Document ID ใน Firestore
   */
  id: string;

  /**
   * LINE User ID ของลูกค้า
   */
  lineUserId: string;

  /**
   * Message ID ที่ได้รับจาก LINE
   */
  lineMessageId?: string;

  /**
   * incoming หรือ outgoing
   */
  direction: LineMessageDirection;

  /**
   * ประเภทข้อความ
   */
  type: LineMessageType;

  /**
   * ข้อความตัวหนังสือ
   */
  text?: string;

  /**
   * URL ไฟล์หลังอัปโหลดเข้า Firebase Storage
   */
  contentUrl?: string;

  /**
   * ชื่อไฟล์
   */
  fileName?: string;

  /**
   * ขนาดไฟล์ หน่วยเป็น byte
   */
  fileSize?: number;

  /**
   * ข้อมูลตำแหน่ง
   */
  location?: LineLocationData;

  /**
   * ข้อมูลสติกเกอร์
   */
  sticker?: LineStickerData;

  /**
   * สถานะการรับหรือส่งข้อความ
   */
  status: LineMessageStatus;

  /**
   * ข้อความแจ้งข้อผิดพลาด
   */
  errorMessage?: string;

  /**
   * พนักงานที่ตอบข้อความ
   */
  sentBy?: string;

  /**
   * ร้านอ่านข้อความแล้วหรือยัง
   */
  read: boolean;

  /**
   * เวลาที่อ่านข้อความ
   */
  readAt?: Timestamp;

  /**
   * เวลาที่สร้างข้อความ
   */
  createdAt?: Timestamp;
}

/**
 * ห้องสนทนาที่ใช้แสดงในหน้ารวมแชท
 */
export interface LineConversation {
  /**
   * ใช้ LINE User ID เป็นรหัสห้องสนทนา
   */
  id: string;

  /**
   * LINE User ID ของลูกค้า
   */
  lineUserId: string;

  /**
   * ชื่อที่แสดงใน LINE
   */
  displayName: string;

  /**
   * รูปโปรไฟล์ลูกค้า
   */
  pictureUrl?: string;

  /**
   * ข้อความล่าสุด
   */
  lastMessage?: string;

  /**
   * ประเภทข้อความล่าสุด
   */
  lastMessageType?: LineMessageType;

  /**
   * เวลาข้อความล่าสุด
   */
  lastMessageAt?: Timestamp;

  /**
   * จำนวนข้อความที่ยังไม่ได้อ่าน
   */
  unreadCount: number;

  /**
   * เลขคิวล่าสุด
   */
  latestQueueNumber?: string;

  /**
   * รหัสออเดอร์ล่าสุด
   */
  latestOrderId?: string;

  /**
   * ซ่อนห้องสนทนาแล้วหรือไม่
   */
  archived: boolean;

  /**
   * เวลาที่สร้างห้องสนทนา
   */
  createdAt?: Timestamp;

  /**
   * เวลาที่แก้ไขล่าสุด
   */
  updatedAt?: Timestamp;
}

/**
 * ข้อมูลข้อความที่ใช้ตอนร้านส่งข้อความหาลูกค้า
 */
export interface SendLineMessageInput {
  lineUserId: string;
  text: string;
  sentBy?: string;
}

/**
 * ผลลัพธ์หลังส่งข้อความ
 */
export interface SendLineMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}