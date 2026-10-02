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

  return result as CreateOrderResult;
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