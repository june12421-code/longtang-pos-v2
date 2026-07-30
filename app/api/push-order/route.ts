import { NextRequest, NextResponse } from "next/server";

type PushOrderRequest = {
  lineUserId: string;
  queueNumber: string;
  customerName: string;
  totalPrice: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PushOrderRequest>;

    const lineUserId = body.lineUserId?.trim();
    const queueNumber = body.queueNumber?.trim();
    const customerName = body.customerName?.trim();
    const totalPrice = body.totalPrice;

    if (!lineUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่พบ LINE User ID",
        },
        { status: 400 }
      );
    }

    if (!queueNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่พบหมายเลขคิว",
        },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่พบชื่อลูกค้า",
        },
        { status: 400 }
      );
    }

    if (typeof totalPrice !== "number" || totalPrice < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ยอดรวมไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const channelAccessToken =
      process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
      console.error(
        "ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน Environment Variables"
      );

      return NextResponse.json(
        {
          success: false,
          message: "ยังไม่ได้ตั้งค่า LINE Channel Access Token",
        },
        { status: 500 }
      );
    }

    const message = [
      "✅ ร้านหลงทั่งได้รับออเดอร์แล้ว",
      "",
      `คุณลูกค้า: ${customerName}`,
      `หมายเลขคิว: ${queueNumber}`,
      `ยอดรวม: ${totalPrice} บาท`,
      "",
      "ขณะนี้ทางร้านกำลังตรวจสอบออเดอร์ของคุณ 🍲",
      "กรุณารอข้อความยืนยันจากทางร้านอีกครั้ง",
    ].join("\n");

    const lineResponse = await fetch(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [
            {
              type: "text",
              text: message,
            },
          ],
        }),
      }
    );

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();

      console.error("LINE Push Message Error:", {
        status: lineResponse.status,
        response: errorText,
      });

      return NextResponse.json(
        {
          success: false,
          message: "LINE ปฏิเสธการส่งข้อความ",
          lineStatus: lineResponse.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ส่งข้อความยืนยันออเดอร์สำเร็จ",
    });
  } catch (error) {
    console.error("Push order message error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "เกิดข้อผิดพลาดขณะส่งข้อความ LINE",
      },
      { status: 500 }
    );
  }
}