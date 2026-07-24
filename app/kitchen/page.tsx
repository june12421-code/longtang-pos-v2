"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import { updateOrderStatus } from "../../services/orderService";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
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
  items: OrderItem[];
  totalPrice: number;
  status: string;
  createdAt?: Timestamp;
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orderList: Order[] = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...(document.data() as Omit<Order, "id">),
          }))
          .filter(
            (order) =>
              order.status !== "completed"
          );

        setOrders(orderList);
        setIsLoading(false);
      },
      (error) => {
        console.error("โหลดออเดอร์หน้าครัวไม่สำเร็จ:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111111",
        color: "white",
        padding: "24px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "24px" }}>
          <h1
            style={{
              color: "#ff6600",
              fontSize: "42px",
              margin: "0 0 8px",
            }}
          >
            🍳 LongTang Kitchen
          </h1>

          <p style={{ color: "#cccccc", fontSize: "20px" }}>
            ออเดอร์ที่ต้องทำ: {orders.length} รายการ
          </p>
        </header>

        {isLoading ? (
          <p>กำลังโหลดออเดอร์...</p>
        ) : orders.length === 0 ? (
          <p style={{ fontSize: "24px" }}>
            ไม่มีออเดอร์ที่ต้องทำ
          </p>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "18px",
            }}
          >
            {orders.map((order) => (
              <article
                key={order.id}
                style={{
                  background: "#222222",
                  borderRadius: "16px",
                  padding: "20px",
                  border:
                    order.status === "ready"
                      ? "3px solid #22c55e"
                      : "3px solid #ff6600",
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  ออเดอร์ {order.id.slice(-6)}
                </h2>

                <p>
                  ลูกค้า: {order.customerName}
                </p>

<p>
  โทร: {order.customerPhone}
</p> 

<p>
  LINE: {order.customerLine || "-"}
</p>


                <p>
                  ที่อยู่: {order.customerAddress}
                </p>

                {order.customerNote && (
                  <p
                    style={{
                      background: "#3a1f1f",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  ><div
  style={{
    background: "#2b2b2b",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "12px",
    lineHeight: 1.8,
  }}
>
  <div>
    🍲 ประเภท:{" "}
    {order.orderType === "shabu"
      ? "ชาบู"
      : order.orderType === "fried"
      ? "หม่าล่าทอด"
      : order.orderType}
  </div>

  {order.orderType === "shabu" && order.selectedSoup && (
    <div>🥣 น้ำซุป: {order.selectedSoup}</div>
  )}

  {order.selectedSpicy && (
    <div>🌶️ ความเผ็ด: {order.selectedSpicy}</div>
  )}

  {order.malaSauceCount > 0 && (
    <div>
      🌶️ ซอสหม่าล่า: {order.malaSauceCount} ถ้วย
    </div>
  )}

  {order.sauces?.sesame > 0 && (
    <div>
      🥣 น้ำจิ้มงา: {order.sauces.sesame} ถ้วย
    </div>
  )}

  {order.sauces?.suki > 0 && (
    <div>
      🥣 น้ำจิ้มสุกี้: {order.sauces.suki} ถ้วย
    </div>
  )}
</div>
                    หมายเหตุ: {order.customerNote}
                  </p>
                )}

                <div
                  style={{
                    borderTop: "1px solid #555555",
                    marginTop: "14px",
                    paddingTop: "14px",
                  }}
                >
                  {order.items?.map((item, index) => (
                    <div
                      key={`${order.id}-${item.id}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "10px",
                        fontSize: "20px",
                      }}
                    >
                      <strong>
                        {item.name} × {item.quantity}
                      </strong>

                      <span>
                        {item.price * item.quantity} บาท
                      </span>
                    </div>
                  ))}
                </div>

                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  สถานะ: {order.status}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() =>
                      updateOrderStatus(
                        order.id,
                        "preparing"
                      )
                    }
                    style={kitchenButtonStyle}
                  >
                    กำลังทำ
                  </button>

                  <button
                    onClick={() =>
                      updateOrderStatus(
                        order.id,
                        "ready"
                      )
                    }
                    style={kitchenButtonStyle}
                  >
                    พร้อมส่ง
                  </button>
                </div>

                <button
                  onClick={() =>
                    updateOrderStatus(
                      order.id,
                      "completed"
                    )
                  }
                  style={{
                    ...kitchenButtonStyle,
                    width: "100%",
                    marginTop: "10px",
                    background: "#15803d",
                  }}
                >
                  เสร็จแล้ว
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

const kitchenButtonStyle = {
  background: "#ff6600",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "14px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};