import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

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
  lineUserId?: string;
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

  const thailandDate = new Intl.DateTimeFormat("en-CA", {
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

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("queue_number")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay);

  if (error) {
    throw new Error(
      `อ่านเลขคิวล่าสุดไม่สำเร็จ: ${error.message}`
    );
  }

  const largestQueueNumber = (data ?? []).reduce(
    (largestNumber, order) => {
      const numericQueue = Number(
        String(order.queue_number ?? "").replace(
          /^A/,
          ""
        )
      );

      if (
        Number.isNaN(numericQueue) ||
        numericQueue <= largestNumber
      ) {
        return largestNumber;
      }

      return numericQueue;
    },
    0
  );

  const nextNumber = largestQueueNumber + 1;

  return `A${String(nextNumber).padStart(3, "0")}`;
}
type SupabaseOrderRow = {
  id: string;
  queue_number: string | null;

  customer_name: string;
  customer_phone: string;
  customer_line: string | null;
  customer_address: string;
  customer_note: string | null;

  order_type: string;
  selected_soup: string | null;
  selected_spicy: string | null;

  sauces: {
    sesame?: number;
    suki?: number;
  } | null;

  mala_sauce_count: number | null;
  selectable_sauce_count: number | null;

  payment_method: string | null;
  payment_status: string | null;

  items: OrderItem[];
  total_price: number;

  status: string;
  created_at: string;
  updated_at: string;
};

function mapOrderRow(order: SupabaseOrderRow) {
  return {
    id: order.id,
    queueNumber: order.queue_number ?? "",

    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerLine: order.customer_line ?? "",
    customerAddress: order.customer_address,
    customerNote: order.customer_note ?? "",

    orderType: order.order_type,
    selectedSoup: order.selected_soup ?? "",
    selectedSpicy: order.selected_spicy ?? "",

    sauces: {
      sesame: order.sauces?.sesame ?? 0,
      suki: order.sauces?.suki ?? 0,
    },

    malaSauceCount:
      order.mala_sauce_count ?? 0,

    selectableSauceCount:
      order.selectable_sauce_count ?? 0,

    paymentMethod:
      order.payment_method ?? "",

    paymentStatus:
      order.payment_status ?? "pending",

    items: order.items ?? [],
    totalPrice: Number(order.total_price),

    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(300);

    if (error) {
      throw new Error(
        `อ่านออเดอร์ไม่สำเร็จ: ${error.message}`
      );
    }

    const orders = (
      (data ?? []) as SupabaseOrderRow[]
    ).map(mapOrderRow);

    return NextResponse.json({
      orders,
    });
  } catch (error) {
    console.error(
      "Supabase get orders error:",
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
export async function POST(request: NextRequest) {
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

    const { data: createdOrder, error } =
      await supabaseAdmin
        .from("orders")
        .insert({
          queue_number: queueNumber,

          customer_name:
            orderData.customerName.trim(),

          customer_phone:
            orderData.customerPhone.trim(),

          customer_line:
            orderData.customerLine?.trim() || null,

          customer_address:
            orderData.customerAddress.trim(),

          customer_note:
            orderData.customerNote?.trim() || "",

          order_type: orderData.orderType,
          selected_soup:
            orderData.selectedSoup || "",
          selected_spicy:
            orderData.selectedSpicy || "",

          sauces: orderData.sauces ?? {
            sesame: 0,
            suki: 0,
          },

          mala_sauce_count:
            orderData.malaSauceCount ?? 0,

          selectable_sauce_count:
            orderData.selectableSauceCount ?? 0,

          payment_method:
            orderData.paymentMethod || null,

          payment_status: "pending",

          items: orderData.items,
          total_price: orderData.totalPrice,

          status: "new",
          updated_at: new Date().toISOString(),
        })
        .select("id, queue_number")
        .single();

    if (error) {
      throw new Error(
        `บันทึกออเดอร์ไม่สำเร็จ: ${error.message}`
      );
    }

    return NextResponse.json({
      orderId: createdOrder.id,
      queueNumber: createdOrder.queue_number,
    });
  } catch (error) {
    console.error(
      "Supabase create order error:",
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

    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          error: "สถานะออเดอร์ไม่ถูกต้อง",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.orderId);

    if (error) {
      throw new Error(
        `เปลี่ยนสถานะออเดอร์ไม่สำเร็จ: ${error.message}`
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Supabase update order error:",
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
    const { count, error: countError } =
      await supabaseAdmin
        .from("orders")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "completed");

    if (countError) {
      throw new Error(
        `ตรวจสอบจำนวนออเดอร์ไม่สำเร็จ: ${countError.message}`
      );
    }

    if (!count || count === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "ไม่มีออเดอร์ที่เสร็จแล้วให้ลบ",
      });
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("orders")
        .delete()
        .eq("status", "completed");

    if (deleteError) {
      throw new Error(
        `ลบออเดอร์ไม่สำเร็จ: ${deleteError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `ลบออเดอร์ที่เสร็จแล้ว ${count} รายการเรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error(
      "Supabase delete completed orders error:",
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