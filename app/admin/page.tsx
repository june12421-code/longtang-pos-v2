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
  customerLine?: string;
  customerAddress: string;
  paymentMethod?: string;
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
  paymentStatus: string;
  queueNumber?: string;  
  createdAt?: Timestamp;
};

    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );
export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
 const previousOrderIds = useRef<Set<string>>(new Set());
const isFirstLoad = useRef(true);
const audioContextRef = useRef<AudioContext | null>(null);
const [soundEnabled, setSoundEnabled] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState(0);
  const pendingCount = orders.filter(
  (order) => order.status === "new"
).length;

const preparingCount = orders.filter(
  (order) => order.status === "preparing"
).length;

const readyCount = orders.filter(
  (order) => order.status === "ready"
).length;

const completedCount = orders.filter(
  (order) => order.status === "completed"
).length;
const todayOrders = orders.filter((order) => {
  if (!order.createdAt) return false;

  const orderDate = order.createdAt.toDate();
  const today = new Date();

  return (
    orderDate.getDate() === today.getDate() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getFullYear() === today.getFullYear()
  );
});
const todaySales = todayOrders
  .filter((order) => order.status !== "cancelled")
  .reduce((sum, order) => sum + order.totalPrice, 0);
  const cashSales = todayOrders
  .filter(
    (order) =>
      order.status !== "cancelled" &&
      order.paymentMethod === "cash"
  )
  .reduce((sum, order) => sum + order.totalPrice, 0);

const transferSales = todayOrders
  .filter(
    (order) =>
      order.status !== "cancelled" &&
      order.paymentMethod === "transfer"
  )
  .reduce((sum, order) => sum + order.totalPrice, 0);

const thaiSupportSales = todayOrders
  .filter(
    (order) =>
      order.status !== "cancelled" &&
      order.paymentMethod === "thai-support"
  )
  .reduce((sum, order) => sum + order.totalPrice, 0);
async function enableNotificationSound() {
  const audioContext = new AudioContext();

  await audioContext.resume();

  audioContextRef.current = audioContext;
  setSoundEnabled(true);

  playNotificationSound(audioContext);
}

function playNotificationSound(
  audioContext = audioContextRef.current
) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.type = "triangle";

  oscillator.frequency.setValueAtTime(
    900,
    audioContext.currentTime
  );

  gain.gain.setValueAtTime(
    0.12,
    audioContext.currentTime
  );

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.35
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.35);
}
function getWaitingTime(createdAt: Date | string | number) {
  const created = new Date(createdAt);
  const now = new Date();

  const diffMinutes = Math.floor(
    (now.getTime() - created.getTime()) / 60000
  );

  return diffMinutes;
}
function printOrder(order: Order) {
  const printWindow = window.open("", "_blank", "width=420,height=700");

  if (!printWindow) {
    alert("กรุณาอนุญาต Popup เพื่อพิมพ์ใบออเดอร์");
    return;
  }

  const itemsHtml = order.items
  .map(
    (item, index) => `
      <div class="row">
        <span>
          ${index + 1}. ${item.name} × ${item.quantity}
        </span>

        <span>
          ${item.price * item.quantity} บาท
        </span>
      </div>
    `
  )
  .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>คิว ${order.queueNumber ?? "-"}</title>

        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }

          body {
            width: 72mm;
            margin: 0 auto;
            font-family: Arial, sans-serif;
            color: #000;
            font-size: 14px;
          }

          h1, h2, p {
            margin: 4px 0;
          }

          .center {
            text-align: center;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 5px 0;
          }

          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }

          .total {
            font-size: 20px;
            font-weight: bold;
          }
        </style>
      </head>

      <body>
        <div class="center">

  <h1 style="margin:0;font-size:26px;">
    🍲 หลงทั่ง
  </h1>

  <div style="font-size:15px;">
    ชาบูหม่าล่า • หม่าล่าทอด • หม่าล่าผัดแห้ง
  </div>

  <div style="margin-top:6px;">
    เปิดทุกวัน 17:30 - 02:00 น.
  </div>

  <div>
    โทร 094-7484287
  </div>

  <div style="margin-top:6px;font-weight:bold;">
    ใบรับออเดอร์
  </div>

</div>

<div class="divider"></div>

<p style="font-size:24px;font-weight:bold;margin-bottom:8px;">
  คิว: ${order.queueNumber ?? "-"}
</p>
      <p><strong>ลูกค้า:</strong> ${order.customerName}</p>
<p><strong>โทร:</strong> ${order.customerPhone}</p>

<p>
  <strong>ชำระเงิน:</strong>
  ${
    order.paymentMethod === "cash"
      ? "เงินสด"
      : order.paymentMethod === "transfer"
      ? "โอนเงิน"
      : order.paymentMethod === "thai-support"
      ? "ไทยช่วยไทย"
      : "ยังไม่มีข้อมูล"
  }
</p>

<p><strong>ที่อยู่:</strong> ${order.customerAddress}</p>  

        <div class="divider"></div>

        ${itemsHtml}

        <div class="divider"></div>

        <div class="row total">
          <span>รวม</span>
          <span>${order.totalPrice} บาท</span>
        </div>

        <p><strong>ประเภท:</strong> ${order.orderType}</p>
        <p><strong>น้ำซุป:</strong> ${order.selectedSoup || "-"}</p>
        <p><strong>ความเผ็ด:</strong> ${order.selectedSpicy || "-"}</p>

        <p>
          <strong>น้ำจิ้มงา:</strong>
          ${order.sauces?.sesame ?? 0} ถ้วย
        </p>

        <p>
          <strong>น้ำจิ้มสุกี้:</strong>
          ${order.sauces?.suki ?? 0} ถ้วย
        </p>

        <p>
          <strong>ซอสหม่าล่า:</strong>
          ${order.malaSauceCount ?? 0} ถ้วย
        </p>

        ${
          order.customerNote
            ? `<p><strong>หมายเหตุ:</strong> ${order.customerNote}</p>`
            : ""
        }

        <div class="divider"></div>

        <p class="center">
          ${new Date().toLocaleString("th-TH")}
        </p>

        <script>
          window.onload = function () {
            window.print();
            window.onafterprint = function () {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
useEffect(() => {
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orderList: Order[] = snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<Order, "id">),
        }));
const currentOrderIds = new Set(
  orderList.map((order) => order.id)
);

if (isFirstLoad.current) {
  previousOrderIds.current = currentOrderIds;
  isFirstLoad.current = false;
} else {
  const newOrders = orderList.filter(
    (order) => !previousOrderIds.current.has(order.id)
  );

  if (newOrders.length > 0) {
    playNotificationSound();
  }

  previousOrderIds.current = currentOrderIds;
}
        setOrders(orderList);
        setIsLoading(false);
      },
      (error) => {
        console.error("อ่านออเดอร์ไม่สำเร็จ:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);
useEffect(() => {
  const timer = setInterval(() => {
    forceUpdate((value) => value + 1);
  }, 60000);

  return () => clearInterval(timer);
}, []);
  return (
    <main
  style={{
    minHeight: "100vh",
    backgroundColor: "#111111",
    padding: "16px",
    color: "#ffffff",
  }}
>
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "24px" }}>
  <h1
    style={{
      margin: 0,
      color: "#ff6600",
      fontSize: "32px",
    }}
  >
    LongTang Admin
  </h1>

  <p style={{ color: "#cccccc" }}>
    รายการคำสั่งซื้อทั้งหมด
  </p>
<button
  type="button"
  onClick={enableNotificationSound}
  style={{
    marginBottom: "16px",
    background: soundEnabled ? "#16a34a" : "#ff6600",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  }}
>
  {soundEnabled
    ? "🔔 เปิดเสียงแล้ว"
    : "🔕 เปิดเสียงแจ้งเตือน"}
</button>
  <input
    type="text"
    placeholder="🔍 ค้นหาชื่อ เบอร์ หรือ LINE"
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    style={{
      width: "100%",
      marginTop: "16px",
      padding: "12px",
      borderRadius: "10px",
      border: "1px solid #555",
      fontSize: "16px",
      boxSizing: "border-box",
    }}
  />

  <div
    style={{
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      marginTop: "12px",
    }}
  >
    <button
      type="button"
      onClick={() => setStatusFilter("all")}
      style={copyButtonStyle}
    >
      ทั้งหมด
    </button>

    <button
      type="button"
      onClick={() => setStatusFilter("new")}
      style={copyButtonStyle}
    >
      🆕 ใหม่
    </button>

    <button
      type="button"
      onClick={() => setStatusFilter("preparing")}
      style={copyButtonStyle}
    >
      👨‍🍳 กำลังทำ
    </button>

    <button
      type="button"
      onClick={() => setStatusFilter("ready")}
      style={copyButtonStyle}
    >
      🛵 พร้อมส่ง
    </button>

    <button
      type="button"
      onClick={() => setStatusFilter("completed")}
      style={copyButtonStyle}
    >
      ✅ เสร็จแล้ว
    </button>
  </div>
</header>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  }}
>
  <div
    style={{
      background: "#dc2626",
      borderRadius: "12px",
      padding: "16px",
      color: "#fff",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "28px", fontWeight: "bold" }}>
      {pendingCount}
    </div>
    <div>🆕 ออเดอร์ใหม่</div>
  </div>

  <div
    style={{
      background: "#f59e0b",
      borderRadius: "12px",
      padding: "16px",
      color: "#fff",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "28px", fontWeight: "bold" }}>
      {preparingCount}
    </div>
    <div>👨‍🍳 กำลังทำ</div>
  </div>

  <div
    style={{
      background: "#16a34a",
      borderRadius: "12px",
      padding: "16px",
      color: "#fff",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "28px", fontWeight: "bold" }}>
      {readyCount}
    </div>
    <div>🛵 พร้อมส่ง</div>
  </div>

  <div
    style={{
      background: "#6b7280",
      borderRadius: "12px",
      padding: "16px",
      color: "#fff",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "28px", fontWeight: "bold" }}>
      {completedCount}
    </div>
    <div>✅ เสร็จแล้ว</div>
  </div>
  <div
  style={{
    background: "#2563eb",
    borderRadius: "12px",
    padding: "16px",
    color: "#fff",
    textAlign: "center",
  }}
>
  <div
    style={{
      fontSize: "28px",
      fontWeight: "bold",
    }}
  >
    ฿{todaySales.toLocaleString()}
  </div>

  <div>💰 ยอดขายรวม</div>
  <div
  style={{
    background: "#15803d",
    borderRadius: "12px",
    padding: "16px",
    color: "#fff",
    textAlign: "center",
  }}
>
  <div style={{ fontSize: "28px", fontWeight: "bold" }}>
    ฿{cashSales.toLocaleString()}
  </div>
  <div>💵 เงินสด</div>
</div>

<div
  style={{
    background: "#7c3aed",
    borderRadius: "12px",
    padding: "16px",
    color: "#fff",
    textAlign: "center",
  }}
>
  <div style={{ fontSize: "28px", fontWeight: "bold" }}>
    ฿{transferSales.toLocaleString()}
  </div>
  <div>📱 โอนเงิน</div>
</div>

<div
  style={{
    background: "#0891b2",
    borderRadius: "12px",
    padding: "16px",
    color: "#fff",
    textAlign: "center",
  }}
>
  <div style={{ fontSize: "28px", fontWeight: "bold" }}>
    ฿{thaiSupportSales.toLocaleString()}
  </div>
  <div>🏦 ไทยช่วยไทย</div>
</div>
</div>
</div>
        {isLoading ? (
          <p>กำลังโหลดออเดอร์...</p>
        ) : orders.length === 0 ? (
          <p>ยังไม่มีออเดอร์</p>
        ) : (
          <section
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
{orders
  .filter((order) => {
    const keyword = searchText.trim().toLowerCase();

    const matchSearch =
      keyword === "" ||
      order.customerName.toLowerCase().includes(keyword) ||
      order.customerPhone.includes(keyword) ||
      (order.customerLine ?? "")
        .toLowerCase()
        .includes(keyword);

    const matchStatus =
      statusFilter === "all" ||
      order.status === statusFilter;

    return matchSearch && matchStatus;
  })
  .map((order) => (          
              <article
                key={order.id}
                style={{
                  background: "#222222",
                  borderRadius: "16px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ margin: "0 0 8px" }}>
  คิว {order.queueNumber ?? "-"}
</h2>

                    <p style={{ margin: "4px 0" }}>
                      ลูกค้า: {order.customerName}
                    </p>

                   <p style={{ margin: "4px 0" }}>
  โทร: {order.customerPhone}{" "}

  <button
    type="button"
    onClick={() =>
      navigator.clipboard.writeText(order.customerPhone)
    }
    style={copyButtonStyle}
  >
    📋
  </button>

  <button
    type="button"
    onClick={() =>
      window.open(`tel:${order.customerPhone}`)
    }
    style={copyButtonStyle}
  >
    📞
  </button>
</p> 
<p style={{ margin: "4px 0" }}>
  💳 ชำระเงิน:{" "}
  {order.paymentMethod === "cash"
    ? "💵 เงินสด"
    : order.paymentMethod === "transfer"
    ? "📱 โอนเงิน"
    : order.paymentMethod === "thai-support"
    ? "🏦 ไทยช่วยไทย"
    : "❓ ยังไม่มีข้อมูล"}
</p>

                    <p>
  LINE: {order.customerLine || "-"}{" "}
  {order.customerLine && (
    <button
      type="button"
      onClick={() =>
       navigator.clipboard.writeText(order.customerLine ?? "")
      }
      style={copyButtonStyle}
    >
      คัดลอก
    </button>
  )}
</p>

                    <p style={{ margin: "4px 0" }}>
  ที่อยู่: {order.customerAddress}{" "}

  <button
    type="button"
    onClick={() =>
      navigator.clipboard.writeText(order.customerAddress)
    }
    style={copyButtonStyle}
  >
    📋
  </button>

  <button
    type="button"
    onClick={() =>
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          order.customerAddress
        )}`,
        "_blank"
      )
    }
    style={copyButtonStyle}
  >
    📍
  </button>
</p>
<div
  style={{
    background: "#2b2b2b",
    borderRadius: "10px",
    padding: "12px",
    marginTop: "12px",
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
                    {order.customerNote && (
                      <p style={{ margin: "4px 0"
                       
                     }}>
                        หมายเหตุ: {order.customerNote}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "24px" }}>
                      {order.totalPrice} บาท
                    </strong>

                    <div
  style={{
    marginTop: "10px",
  }}
>
  <span
    style={{
      ...getStatusStyle(order.status),
      padding: "6px 12px",
      borderRadius: "999px",
      fontWeight: "bold",
      display: "inline-block",
    }}
  >
    {order.status === "new"
      ? "🆕 ออเดอร์ใหม่"
      : order.status === "preparing"
      ? "👨‍🍳 กำลังทำ"
      : order.status === "ready"
      ? "🛵 พร้อมส่ง"
      : order.status === "completed"
      ? "✅ เสร็จแล้ว"
      : order.status}
  </span>
</div>
                    <div
  style={{
    display: "flex",
    gap: "8px",
    marginTop: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  }}
>
  <button
    onClick={() => updateOrderStatus(order.id, "preparing")}
    style={statusButtonStyle}
  >
    กำลังทำ
  </button>

  <button
    onClick={() => updateOrderStatus(order.id, "ready")}
    style={statusButtonStyle}
  >
    พร้อมส่ง
  </button>

  <button
    onClick={() => updateOrderStatus(order.id, "completed")}
    style={statusButtonStyle}
  >
    เสร็จแล้ว
  </button>
  <button
  onClick={() => printOrder(order)}
  style={statusButtonStyle}
>
  🖨️ พิมพ์
</button>
</div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    borderTop: "1px solid #444444",
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
                        marginBottom: "8px",
                      }}
                    >
                      <span>
                        {item.name} × {item.quantity}
                      </span>

                      <span>
                        {item.price * item.quantity} บาท
                      </span>
                    </div>
                  ))}
                </div>

 {order.status !== "completed" && (
  <p
    style={{
      marginBottom: 0,
      color:
        order.createdAt &&
        getWaitingTime(order.createdAt.toDate()) >= 30
          ? "#ef4444"
          : order.createdAt &&
            getWaitingTime(order.createdAt.toDate()) >= 20
          ? "#f59e0b"
          : "#22c55e",
      fontSize: "14px",
    }}
  >
    🕒 รอแล้ว{" "}
    {order.createdAt
      ? getWaitingTime(order.createdAt.toDate())
      : 0}{" "}
    นาที
  </p>
)}             
              </article>
            ))}
          </section>
        )}
      </div>
        </main>
  );
}

const statusButtonStyle = {
  background: "#ff6600",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};
const copyButtonStyle = {
  marginLeft: "8px",
  padding: "2px 8px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  background: "#ffffff",
  color: "#000000",
  cursor: "pointer",
};const getStatusStyle = (status: string) => {
  switch (status) {
    case "new":
      return {
        background: "#dc2626",
        color: "#fff",
      };

    case "preparing":
      return {
        background: "#f59e0b",
        color: "#fff",
      };

    case "ready":
      return {
        background: "#16a34a",
        color: "#fff",
      };

    case "completed":
      return {
        background: "#6b7280",
        color: "#fff",
      };

    default:
      return {
        background: "#374151",
        color: "#fff",
      };
  }
};