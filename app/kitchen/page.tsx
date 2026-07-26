"use client";

import { useEffect, useRef, useState } from "react";
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
  const [soundEnabled, setSoundEnabled] = useState(false);

  const isFirstSnapshot = useRef(true);
  const previousOrderIds = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef(false);

  const enableNotificationSound = () => {
    soundEnabledRef.current = true;
    setSoundEnabled(true);
    playNotificationSound();
  };

  const playNotificationSound = () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      gainNode.gain.setValueAtTime(
        0.35,
        audioContext.currentTime
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.8
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);

      oscillator.onended = () => {
        void audioContext.close();
      };
    } catch (error) {
      console.error("เปิดเสียงแจ้งเตือนไม่สำเร็จ:", error);
    }
  };

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
          .filter((order) => order.status !== "completed");

        const currentOrderIds = new Set(
          orderList.map((order) => order.id)
        );

        if (isFirstSnapshot.current) {
          previousOrderIds.current = currentOrderIds;
          isFirstSnapshot.current = false;
        } else {
          const hasNewOrder = orderList.some(
            (order) =>
              !previousOrderIds.current.has(order.id)
          );

          if (hasNewOrder && soundEnabledRef.current) {
            playNotificationSound();
          }

          previousOrderIds.current = currentOrderIds;
        }

        setOrders(orderList);
        setIsLoading(false);
      },
      (error) => {
        console.error(
          "โหลดออเดอร์หน้าครัวไม่สำเร็จ:",
          error
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getOrderTypeLabel = (orderType: string) => {
    if (orderType === "shabu") {
      return "ชาบู";
    }

    if (orderType === "dry") {
      return "หม่าล่าผัดแห้ง";
    }

    if (orderType === "fried") {
      return "หม่าล่าทอด";
    }

    return orderType || "-";
  };

  const getStatusLabel = (status: string) => {
    if (status === "pending") {
      return "รอรับออเดอร์";
    }

    if (status === "preparing") {
      return "กำลังทำ";
    }

    if (status === "ready") {
      return "พร้อมส่ง";
    }

    return status;
  };

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
        <header
          style={{
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                color: "#ff6600",
                fontSize: "42px",
                margin: "0 0 8px",
              }}
            >
              🍳 LongTang Kitchen
            </h1>

            <p
              style={{
                color: "#cccccc",
                fontSize: "20px",
                margin: 0,
              }}
            >
              ออเดอร์ที่ต้องทำ: {orders.length} รายการ
            </p>
          </div>

          <button
            type="button"
            onClick={enableNotificationSound}
            style={{
              background: soundEnabled
                ? "#15803d"
                : "#ff6600",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "14px 18px",
              fontSize: "17px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {soundEnabled
              ? "🔔 เปิดเสียงแล้ว"
              : "🔕 กดเปิดเสียงแจ้งเตือน"}
          </button>
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
                <h2
  style={{
    marginTop: 0,
    fontSize: "34px",
    color: "#ffcc00",
    textAlign: "center",
  }}
>
  🅰️ คิว {("queueNumber" in order && (order as { queueNumber?: string }).queueNumber) || "-"}
</h2>
                

                <p>ลูกค้า: {order.customerName}</p>

                <p>โทร: {order.customerPhone}</p>

                <p>
                  LINE: {order.customerLine || "-"}
                </p>

                <p>
                  ที่อยู่: {order.customerAddress || "-"}
                </p>

                <div
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
                    {getOrderTypeLabel(order.orderType)}
                  </div>

                  {order.orderType === "shabu" &&
                    order.selectedSoup && (
                      <div>
                        🥣 น้ำซุป: {order.selectedSoup}
                      </div>
                    )}

                  {order.selectedSpicy && (
                    <div>
                      🌶️ ความเผ็ด:{" "}
                      {order.selectedSpicy}
                    </div>
                  )}

                  {order.malaSauceCount > 0 && (
                    <div>
                      🌶️ ซอสหม่าล่า:{" "}
                      {order.malaSauceCount} ถ้วย
                    </div>
                  )}

                  {order.sauces?.sesame > 0 && (
                    <div>
                      🥣 น้ำจิ้มงา:{" "}
                      {order.sauces.sesame} ถ้วย
                    </div>
                  )}

                  {order.sauces?.suki > 0 && (
                    <div>
                      🥣 น้ำจิ้มสุกี้:{" "}
                      {order.sauces.suki} ถ้วย
                    </div>
                  )}
                </div>

                {order.customerNote && (
                  <div
                    style={{
                      background: "#3a1f1f",
                      padding: "10px",
                      borderRadius: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    หมายเหตุ: {order.customerNote}
                  </div>
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
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: "#ffcc00",
                  }}
                >
                  รวม {order.totalPrice || 0} บาท
                </p>

                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  สถานะ:{" "}
                  {getStatusLabel(order.status)}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
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
                    type="button"
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
                  type="button"
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