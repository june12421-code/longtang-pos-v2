import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../lib/firebase";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type CreateOrderBody = {
  customerName: string;
  customerPhone: string;
  customerLine: string;
  customerAddress: string;
  customerNote: string;

  orderType: string;
  selectedSoup: string;
  selectedSpicy: string;

  sauces: {
    sesame: number;
    suki: number;
  };

  malaSauceCount: number;
  selectableSauceCount: number;
  paymentMethod: string;

  items: OrderItem[];
  totalPrice: number;
};

type UpdateStatusBody = {
  orderId: string;
  status: string;
};

const allowedStatuses = [
  "new",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

function getThailandDateRange() {
  const now = new Date();

  const thailandDate =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

  const startOfDay = new Date(
    `${thailandDate}T00:00:00+07:00`
  );

  const endOfDay = new Date(
    `${thailandDate}T23:59:59.999+07:00`
  );

  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
  };
}

async function createNextQueueNumber() {
  const { startOfDay, endOfDay } =
    getThailandDateRange();

  const ordersRef = collection(db, "orders");

  const snapshot = await getDocs(
    query(
      ordersRef,
      where(
        "createdAt",
        ">=",
        startOfDay
      ),
      where(
        "createdAt",
        "<=",
        endOfDay
      )
    )
  );

  let largestQueueNumber = 0;

  snapshot.forEach((orderDoc) => {
    const data = orderDoc.data();

    const numericQueue = Number(
      String(data.queueNumber ?? "").replace(
        /^A/,
        ""
      )
    );

    if (
      !Number.isNaN(numericQueue) &&
      numericQueue > largestQueueNumber
    ) {
      largestQueueNumber = numericQueue;
    }
  });

  const nextNumber =
    largestQueueNumber + 1;

  return `A${String(nextNumber).padStart(
    3,
    "0"
  )}`;
}

function mapOrderDoc(
  id: string,
  data: Record<string, unknown>
) {
  return {
    id,

    queueNumber:
      typeof data.queueNumber === "string"
        ? data.queueNumber
        : "",

    customerName:
      typeof data.customerName === "string"
        ? data.customerName
        : "",

    customerPhone:
      typeof data.customerPhone === "string"
        ? data.customerPhone
        : "",

    customerLine:
      typeof data.customerLine === "string"
        ? data.customerLine
        : "",

    customerAddress:
      typeof data.customerAddress === "string"
        ? data.customerAddress
        : "",

    customerNote:
      typeof data.customerNote === "string"
        ? data.customerNote
        : "",

    orderType:
      typeof data.orderType === "string"
        ? data.orderType
        : "",

    selectedSoup:
      typeof data.selectedSoup === "string"
        ? data.selectedSoup
        : "",

    selectedSpicy:
      typeof data.selectedSpicy === "string"
        ? data.selectedSpicy
        : "",

    sauces:
      data.sauces ?? {
        sesame: 0,
        suki: 0,
      },

    malaSauceCount:
      typeof data.malaSauceCount === "number"
        ? data.malaSauceCount
        : 0,

    selectableSauceCount:
      typeof data.selectableSauceCount ===
      "number"
        ? data.selectableSauceCount
        : 0,

    paymentMethod:
      typeof data.paymentMethod === "string"
        ? data.paymentMethod
        : "",

    paymentStatus:
      typeof data.paymentStatus === "string"
        ? data.paymentStatus
        : "pending",

    items: Array.isArray(data.items)
      ? data.items
      : [],

    totalPrice:
      typeof data.totalPrice === "number"
        ? data.totalPrice
        : 0,

    status:
      typeof data.status === "string"
        ? data.status
        : "new",

    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : "",

    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : "",
  };
}

export async function GET() {
  try {
    const ordersRef =
      collection(db, "orders");

    const snapshot = await getDocs(
      query(
        ordersRef,
        orderBy("createdAt", "desc")
      )
    );

    const orders = snapshot.docs
      .slice(0, 300)
      .map((orderDoc) =>
        mapOrderDoc(
          orderDoc.id,
          orderDoc.data()
        )
      );

    return NextResponse.json({
      orders,
    });
  } catch (error) {
    console.error(
      "Firebase get orders error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "อ่านออเดอร์ไม่สำเร็จ",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const orderData =
      (await request.json()) as CreateOrderBody;

    if (!orderData.customerName?.trim()) {
      return NextResponse.json(
        {
          error: "กรุณากรอกชื่อลูกค้า",
        },
        {
          status: 400,
        }
      );
    }

    if (!orderData.customerPhone?.trim()) {
      return NextResponse.json(
        {
          error: "กรุณากรอกเบอร์โทรศัพท์",
        },
        {
          status: 400,
        }
      );
    }

    if (!orderData.customerAddress?.trim()) {
      return NextResponse.json(
        {
          error: "กรุณากรอกที่อยู่จัดส่ง",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0
    ) {
      return NextResponse.json(
        {
          error: "ไม่พบสินค้าในออเดอร์",
        },
        {
          status: 400,
        }
      );
    }

    const queueNumber =
      await createNextQueueNumber();

    const orderRef = doc(
      collection(db, "orders")
    );

    const now =
      new Date().toISOString();

    await setDoc(orderRef, {
      queueNumber,

      customerName:
        orderData.customerName.trim(),

      customerPhone:
        orderData.customerPhone.trim(),

      customerLine:
        orderData.customerLine?.trim() || "",

      customerAddress:
        orderData.customerAddress.trim(),

      customerNote:
        orderData.customerNote?.trim() || "",

      orderType:
        orderData.orderType,

      selectedSoup:
        orderData.selectedSoup || "",

      selectedSpicy:
        orderData.selectedSpicy || "",

      sauces:
        orderData.sauces ?? {
          sesame: 0,
          suki: 0,
        },

      malaSauceCount:
        orderData.malaSauceCount ?? 0,

      selectableSauceCount:
        orderData.selectableSauceCount ??
        0,

      paymentMethod:
        orderData.paymentMethod || "",

      paymentStatus: "pending",

      items: orderData.items,

      totalPrice:
        orderData.totalPrice,

      status: "new",

      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      orderId: orderRef.id,
      queueNumber,
    });
  } catch (error) {
    console.error(
      "Firebase create order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "บันทึกออเดอร์ไม่สำเร็จ",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as UpdateStatusBody;

    if (!body.orderId) {
      return NextResponse.json(
        {
          error: "ไม่พบรหัสออเดอร์",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedStatuses.includes(body.status)
    ) {
      return NextResponse.json(
        {
          error: "สถานะออเดอร์ไม่ถูกต้อง",
        },
        {
          status: 400,
        }
      );
    }

    const orderRef = doc(
      db,
      "orders",
      body.orderId
    );

    await updateDoc(orderRef, {
      status: body.status,
      updatedAt:
        new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Firebase update order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "เปลี่ยนสถานะออเดอร์ไม่สำเร็จ",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE() {
  try {
    const ordersRef =
      collection(db, "orders");

    const snapshot = await getDocs(
      query(
        ordersRef,
        where(
          "status",
          "==",
          "completed"
        )
      )
    );

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message:
          "ไม่มีออเดอร์ที่เสร็จแล้วให้ลบ",
      });
    }

    await Promise.all(
      snapshot.docs.map((orderDoc) =>
        deleteDoc(
          doc(
            db,
            "orders",
            orderDoc.id
          )
        )
      )
    );

    return NextResponse.json({
      success: true,
      deletedCount: snapshot.size,
      message:
        `ลบออเดอร์ที่เสร็จแล้ว ${snapshot.size} รายการเรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error(
      "Firebase delete completed orders error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "ลบออเดอร์ไม่สำเร็จ",
      },
      {
        status: 500,
      }
    );
  }
}