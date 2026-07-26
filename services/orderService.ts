import {
  addDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";

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

export async function createOrder(
  orderData: CreateOrderInput
): Promise<CreateOrderResult> {
  const today = new Date();

  const dateKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

   const counterReference = doc(db, "queueCounters", dateKey);
  const orderReference = doc(collection(db, "orders"));

  let createdQueueNumber = ""; 

  await runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(counterReference);

    const lastNumber = counterSnapshot.exists()
      ? counterSnapshot.data().lastNumber ?? 0
      : 0;

        const nextNumber = lastNumber + 1;
    const queueNumber = `A${String(nextNumber).padStart(3, "0")}`;

    createdQueueNumber = queueNumber;

    transaction.set(counterReference, {
      lastNumber: nextNumber,
      updatedAt: serverTimestamp(),
    });

    transaction.set(orderReference, {
      ...orderData,
      status: "new",
      paymentStatus: "pending",
      staffName: null,
      queueNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

    return {
    orderId: orderReference.id,
    queueNumber: createdQueueNumber,
  };
}
  
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  const orderReference = doc(db, "orders", orderId);

  await updateDoc(orderReference, {
    status,
    updatedAt: serverTimestamp(),
  });
}