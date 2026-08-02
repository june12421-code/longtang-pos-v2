export type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  customerLine: string;

  /**
   * LINE User ID
   * ใช้ส่งข้อความอัตโนมัติกลับหาลูกค้า
   */
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

export type CreateOrderResult = {
  orderId: string;
  queueNumber: string;
};

type ApiErrorResponse = {
  error?: string;
};

export async function createOrder(
  orderData: CreateOrderInput
): Promise<CreateOrderResult> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  const result = (await response.json()) as
    | CreateOrderResult
    | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      "error" in result && result.error
        ? result.error
        : "บันทึกออเดอร์ไม่สำเร็จ"
    );
  }

  const createdOrder = result as CreateOrderResult;

  if (orderData.lineUserId) {
    try {
      await fetch("/api/line/push-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineUserId: orderData.lineUserId,
          customerName: orderData.customerName,
          queueNumber: createdOrder.queueNumber,
          totalPrice: orderData.totalPrice,
        }),
      });
    } catch (error) {
      console.error(
        "ส่งข้อความ LINE ไม่สำเร็จ:",
        error
      );
    }
  }

  return createdOrder;
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  const response = await fetch("/api/orders", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      status,
    }),
  });

  const result =
    (await response.json()) as ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      result.error ||
        "เปลี่ยนสถานะออเดอร์ไม่สำเร็จ"
    );
  }
}