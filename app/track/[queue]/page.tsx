"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../../lib/firebase";

type OrderTracking = {
  queueNumber: string;
  status: string;
  customerName?: string;
  orderType?: string;
  totalPrice?: number;
};

const statusSteps = [
  {
    key: "new",
    title: "รับออเดอร์แล้ว",
    description: "ร้านได้รับคำสั่งซื้อของคุณแล้ว",
  },
  {
    key: "preparing",
    title: "กำลังทำ",
    description: "ร้านกำลังเตรียมอาหารให้คุณ",
  },
  {
    key: "ready",
    title: "พร้อมส่ง",
    description: "อาหารของคุณพร้อมแล้ว",
  },
  {
    key: "completed",
    title: "เสร็จเรียบร้อย",
    description: "ออเดอร์นี้ดำเนินการเรียบร้อยแล้ว",
  },
];

function getStatusIndex(status: string) {
  const index = statusSteps.findIndex((step) => step.key === status);

  return index >= 0 ? index : 0;
}

function getStatusText(status: string) {
  switch (status) {
    case "new":
      return "รับออเดอร์แล้ว";

    case "preparing":
      return "กำลังทำ";

    case "ready":
      return "พร้อมส่ง";

    case "completed":
      return "เสร็จเรียบร้อย";

    default:
      return "กำลังตรวจสอบสถานะ";
  }
}

function getStatusEmoji(status: string) {
  switch (status) {
    case "new":
      return "🧾";

    case "preparing":
      return "🍲";

    case "ready":
      return "🛍️";

    case "completed":
      return "✅";

    default:
      return "⏳";
  }
}

export default function TrackOrderPage() {
  const params = useParams();

  const queueParam = params.queue;

  const queueNumber = Array.isArray(queueParam)
    ? queueParam[0]
    : queueParam;

  const normalizedQueueNumber =
    typeof queueNumber === "string"
      ? decodeURIComponent(queueNumber).toUpperCase()
      : "";

  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!normalizedQueueNumber) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const orderQuery = query(
      collection(db, "orders"),
      where("queueNumber", "==", normalizedQueueNumber)
    );

    const unsubscribe = onSnapshot(
      orderQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setOrder(null);
          setNotFound(true);
          setLoading(false);
          return;
        }

        const orderDocument = snapshot.docs[0];

        setOrder({
          queueNumber:
            orderDocument.data().queueNumber ?? normalizedQueueNumber,
          status: orderDocument.data().status ?? "new",
          customerName: orderDocument.data().customerName ?? "",
          orderType: orderDocument.data().orderType ?? "",
          totalPrice: orderDocument.data().totalPrice ?? 0,
        });

        setNotFound(false);
        setLoading(false);
      },
      (error) => {
        console.error("ติดตามสถานะออเดอร์ไม่สำเร็จ:", error);

        setOrder(null);
        setNotFound(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [normalizedQueueNumber]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>

          <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
            กำลังตรวจสอบออเดอร์
          </h1>

          <p style={{ color: "#666666" }}>
            กรุณารอสักครู่
          </p>
        </section>
      </main>
    );
  }

  if (notFound || !order) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>🔍</div>

          <h1 style={{ fontSize: "25px", marginBottom: "10px" }}>
            ไม่พบออเดอร์
          </h1>

          <p style={{ color: "#666666", lineHeight: 1.6 }}>
            ไม่พบหมายเลขคิว
            <br />
            <strong>{normalizedQueueNumber || "-"}</strong>
          </p>

          <p
            style={{
              color: "#888888",
              marginTop: "14px",
              fontSize: "14px",
            }}
          >
            กรุณาตรวจสอบหมายเลขคิวอีกครั้ง
          </p>
        </section>
      </main>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <main style={pageStyle}>
      <section
        style={{
          ...cardStyle,
          textAlign: "left",
        }}
      >
        <header
          style={{
            textAlign: "center",
            borderBottom: "1px solid #eeeeee",
            paddingBottom: "20px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "4px",
            }}
          >
            🍲
          </div>

          <h1
            style={{
              fontSize: "30px",
              margin: 0,
            }}
          >
            หลงทั่ง
          </h1>

          <p
            style={{
              color: "#666666",
              marginTop: "6px",
            }}
          >
            ติดตามสถานะออเดอร์แบบเรียลไทม์
          </p>
        </header>

        <div
          style={{
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              color: "#777777",
              marginBottom: "4px",
            }}
          >
            หมายเลขคิว
          </p>

          <div
            style={{
              fontSize: "44px",
              fontWeight: "bold",
              color: "#ff6600",
              lineHeight: 1.2,
            }}
          >
            {order.queueNumber}
          </div>

          {order.customerName && (
            <p
              style={{
                marginTop: "8px",
                color: "#555555",
              }}
            >
              ลูกค้า: {order.customerName}
            </p>
          )}
        </div>

        <div
          style={{
            backgroundColor: "#fff3e8",
            border: "2px solid #ff6600",
            borderRadius: "16px",
            padding: "18px",
            textAlign: "center",
            marginBottom: "26px",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "8px",
            }}
          >
            {getStatusEmoji(order.status)}
          </div>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
            }}
          >
            สถานะปัจจุบัน
          </p>

          <h2
            style={{
              margin: "5px 0 0",
              fontSize: "28px",
              color: "#d94f00",
            }}
          >
            {getStatusText(order.status)}
          </h2>
        </div>

        <div>
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;

            return (
              <div
                key={step.key}
                style={{
                  display: "flex",
                  gap: "14px",
                  position: "relative",
                  minHeight: "86px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "32px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isCompleted
                        ? "#ff6600"
                        : "#dddddd",
                      color: "#ffffff",
                      fontWeight: "bold",
                      zIndex: 2,
                    }}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>

                  {index < statusSteps.length - 1 && (
                    <div
                      style={{
                        width: "3px",
                        flex: 1,
                        backgroundColor:
                          index < currentStatusIndex
                            ? "#ff6600"
                            : "#dddddd",
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    paddingBottom: "22px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      color: isCompleted
                        ? "#222222"
                        : "#999999",
                    }}
                  >
                    {step.title}
                    {isCurrent ? " • ตอนนี้" : ""}
                  </h3>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: isCompleted
                        ? "#666666"
                        : "#aaaaaa",
                      lineHeight: 1.5,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            borderTop: "1px solid #eeeeee",
            paddingTop: "18px",
            marginTop: "4px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#777777",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            หน้านี้จะอัปเดตอัตโนมัติ
            <br />
            ไม่ต้องกดรีเฟรช
          </p>
        </div>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f5f5f5",
  padding: "20px 14px",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const cardStyle = {
  width: "100%",
  maxWidth: "520px",
  backgroundColor: "#ffffff",
  borderRadius: "20px",
  padding: "24px 20px",
  boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
  textAlign: "center" as const,
};