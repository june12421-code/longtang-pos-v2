"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Timestamp } from "firebase/firestore";

type TrackingOrder = {
  id: string;
  queueNumber: string;
  status: string;
  customerLine: string;
  customerName: string;
  orderType: string;
  totalPrice: number;
  createdAt: Timestamp | string | null;
};

const statusOrder = [
  "new",
  "preparing",
  "ready",
  "completed",
];

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function getQueueNumberValue(queueNumber: string) {
  const numberOnly = queueNumber.replace(/\D/g, "");
  return Number(numberOnly) || 0;
}

function isToday(
  timestamp: Timestamp | string | null
) {
  if (!timestamp) {
    return false;
  }

  const orderDate =
    timestamp instanceof Timestamp
      ? timestamp.toDate()
      : new Date(timestamp);

  if (Number.isNaN(orderDate.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    orderDate.getFullYear() === today.getFullYear() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getDate() === today.getDate()
  );
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
      return "จัดส่งแล้ว";

    default:
      return "กำลังตรวจสอบ";
  }
}

function getStatusEmoji(status: string) {
  switch (status) {
    case "new":
      return "🧾";

    case "preparing":
      return "🍳";

    case "ready":
      return "🛍️";

    case "completed":
      return "✅";

    default:
      return "⏳";
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case "new":
      return "ร้านได้รับคำสั่งซื้อของคุณแล้ว";

    case "preparing":
      return "ร้านกำลังเตรียมอาหารให้คุณ";

    case "ready":
      return "อาหารของคุณพร้อมรับหรือพร้อมจัดส่งแล้ว";

    case "completed":
      return "ออเดอร์ของคุณดำเนินการเรียบร้อยแล้ว";

    default:
      return "กรุณารอสักครู่";
  }
}

function getStatusBackground(status: string) {
  switch (status) {
    case "new":
      return "#fff7d6";

    case "preparing":
      return "#fff0e6";

    case "ready":
      return "#dcfce7";

    case "completed":
      return "#e5e7eb";

    default:
      return "#f3f4f6";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "new":
      return "#854d0e";

    case "preparing":
      return "#c2410c";

    case "ready":
      return "#166534";

    case "completed":
      return "#374151";

    default:
      return "#555555";
  }
}

export default function TrackPage() {
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchedText, setSearchedText] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [searchMessage, setSearchMessage] = useState("");
async function loadOrders() {
  try {
    const response = await fetch("/api/orders", {
      method: "GET",
      cache: "no-store",
    });

    const result = (await response.json()) as {
      orders?: TrackingOrder[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        result.error || "โหลดสถานะออเดอร์ไม่สำเร็จ"
      );
    }

    setOrders(result.orders ?? []);
    setSearchMessage("");
  } catch (error) {
    console.error(
      "โหลดสถานะออเดอร์จาก Supabase ไม่สำเร็จ:",
      error
    );

    setSearchMessage(
      error instanceof Error
        ? error.message
        : "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่"
    );
  } finally {
    setLoading(false);
  }
}
  useEffect(() => {
  loadOrders();

  const timer = window.setInterval(() => {
    loadOrders();
  }, 5000);

  return () => {
    window.clearInterval(timer);
  };
}, []);

  const todayOrders = useMemo(() => {
    return orders
      .filter((order) => isToday(order.createdAt))
      .sort(
        (a, b) =>
          getQueueNumberValue(a.queueNumber) -
          getQueueNumberValue(b.queueNumber)
      );
  }, [orders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }

    return (
      todayOrders.find((order) => order.id === selectedOrderId) ?? null
    );
  }, [selectedOrderId, todayOrders]);

  const queueBeforeCount = useMemo(() => {
    if (!selectedOrder) {
      return 0;
    }

    if (selectedOrder.status === "completed") {
      return 0;
    }

    const selectedQueueValue = getQueueNumberValue(
      selectedOrder.queueNumber
    );

    return todayOrders.filter((order) => {
      const orderQueueValue = getQueueNumberValue(order.queueNumber);

      return (
        orderQueueValue < selectedQueueValue &&
        order.status !== "completed"
      );
    }).length;
  }, [selectedOrder, todayOrders]);

  const estimatedMinutes = queueBeforeCount * 4;

  const visibleQueueOrders = useMemo(() => {
    return [...todayOrders]
      .sort(
        (a, b) =>
          getQueueNumberValue(b.queueNumber) -
          getQueueNumberValue(a.queueNumber)
      )
      .slice(0, 20);
  }, [todayOrders]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSearchText = normalizeText(searchText);

    setSearchedText(searchText.trim());
    setSearchMessage("");

    if (!normalizedSearchText) {
      setSelectedOrderId(null);
      setSearchMessage(
        "กรุณากรอกหมายเลขคิวหรือชื่อ LINE ก่อนตรวจสอบ"
      );
      return;
    }

    const foundOrder = [...todayOrders]
      .reverse()
      .find((order) => {
        const normalizedQueue = normalizeText(order.queueNumber);
        const normalizedLine = normalizeText(order.customerLine);

        return (
          normalizedQueue === normalizedSearchText ||
          normalizedLine === normalizedSearchText
        );
      });

    if (!foundOrder) {
      setSelectedOrderId(null);
      setSearchMessage(
        `ไม่พบออเดอร์ของวันนี้จากข้อมูล “${searchText.trim()}”`
      );
      return;
    }

    setSelectedOrderId(foundOrder.id);
  }

  const currentStatusIndex = selectedOrder
    ? Math.max(statusOrder.indexOf(selectedOrder.status), 0)
    : 0;

  return (
    <main
  className="track-page"
  style={{
        minHeight: "100vh",
        backgroundColor: "#f4f4f5",
        padding: "18px 14px 40px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
            borderRadius: "20px",
            padding: "24px 18px",
            textAlign: "center",
            marginBottom: "16px",
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
              margin: "8px 0 0",
              color: "#dddddd",
            }}
          >
            ติดตามสถานะออเดอร์แบบเรียลไทม์
          </p>
        </header>

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "20px 16px",
            marginBottom: "16px",
            boxShadow: "0 3px 14px rgba(0, 0, 0, 0.07)",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              margin: "0 0 8px",
            }}
          >
            ตรวจสอบสถานะออเดอร์
          </h2>

          <p
            style={{
              color: "#666666",
              lineHeight: 1.6,
              margin: "0 0 16px",
            }}
          >
            กรุณาใส่หมายเลขคิวหรือชื่อ LINE
            เพื่อตรวจสอบสถานะออเดอร์ของคุณ
          </p>

          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="เช่น A006 หรือ @line123"
              autoComplete="off"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                border: "1px solid #cccccc",
                borderRadius: "12px",
                fontSize: "17px",
                marginBottom: "10px",
                color: "#111111",
backgroundColor: "#ffffff",
caretColor: "#111111",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "12px",
                backgroundColor: "#ff6600",
                color: "#ffffff",
                fontSize: "17px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? "กำลังโหลดข้อมูล..."
                : "🔍 ตรวจสอบสถานะ"}
            </button>
          </form>

          {searchMessage && (
            <div
              style={{
                backgroundColor: "#fff7d6",
                borderRadius: "10px",
                padding: "12px",
                marginTop: "14px",
                color: "#713f12",
                lineHeight: 1.5,
              }}
            >
              {searchMessage}
            </div>
          )}
        </section>

        {selectedOrder && (
          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "20px 16px",
              marginBottom: "16px",
              boxShadow: "0 3px 14px rgba(0, 0, 0, 0.07)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "18px",
              }}
            >
              <p
                style={{
                  color: "#777777",
                  margin: "0 0 4px",
                }}
              >
                หมายเลขคิวของคุณ
              </p>

              <div
                style={{
                  fontSize: "45px",
                  fontWeight: "bold",
                  color: "#ff6600",
                }}
              >
                {selectedOrder.queueNumber}
              </div>
            </div>

            <div
              style={{
                backgroundColor: getStatusBackground(
                  selectedOrder.status
                ),
                color: getStatusColor(selectedOrder.status),
                borderRadius: "15px",
                padding: "18px",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  marginBottom: "6px",
                }}
              >
                {getStatusEmoji(selectedOrder.status)}
              </div>

              <div
                style={{
                  fontSize: "27px",
                  fontWeight: "bold",
                }}
              >
                {getStatusText(selectedOrder.status)}
              </div>

              <p
  className="status-description-text"
  style={{
    margin: "7px 0 0",
    lineHeight: 1.5,
  }}
>
  {getStatusDescription(selectedOrder.status)}
</p>
</div>

{selectedOrder.status !== "completed" && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px",
      marginBottom: "22px",
    }}
  >
    <div
      className="queue-summary-box"
      style={{
        backgroundColor: "#FFF7D6",
        border: "2px solid #FFB347",
        borderRadius: "18px",
        padding: "18px 12px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#E46A00",
          fontSize: "14px",
        }}
      >
        จำนวนคิวก่อนหน้า
      </p>

      <strong
        style={{
          display: "block",
          fontSize: "30px",
          marginTop: "5px",
          color: "#FF6600",
        }}
      >
        {queueBeforeCount}
      </strong>

      <span
        style={{
          color: "#E46A00",
        }}
      >
        คิว
      </span>
    </div>

    <div
      className="queue-summary-box"
      style={{
        backgroundColor: "#FFF7D6",
        border: "2px solid #FFB347",
        borderRadius: "18px",
        padding: "18px 12px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#E46A00",
          fontSize: "14px",
        }}
      >
        เวลารอโดยประมาณ
      </p>

      <strong
        style={{
          display: "block",
          fontSize: "30px",
          marginTop: "5px",
          color: "#FF6600",
        }}
      >
        {estimatedMinutes}
      </strong>

      <span
        style={{
          color: "#E46A00",
        }}
      >
        นาที
      </span>
    </div>
  </div>
)}
<h3
              style={{
                fontSize: "20px",
                marginBottom: "16px",
              }}
            >
              ความคืบหน้าของออเดอร์
            </h3>

            {statusOrder.map((status, index) => {
              const isPassed = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    gap: "12px",
                    minHeight: "66px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "30px",
                    }}
                  >
                    <div
                      style={{
                        width: "29px",
                        height: "29px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isPassed
                          ? "#ff6600"
                          : "#dddddd",
                        color: "#ffffff",
                        fontWeight: "bold",
                      }}
                    >
                      {isPassed ? "✓" : index + 1}
                    </div>

                    {index < statusOrder.length - 1 && (
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

                  <div>
                    <strong
                      style={{
                        color: isPassed
                          ? "#222222"
                          : "#999999",
                        fontSize: "17px",
                      }}
                    >
                      {getStatusText(status)}
                      {isCurrent ? " • ตอนนี้" : ""}
                    </strong>
                  </div>
                </div>
              );
            })}

            <p
              style={{
                borderTop: "1px solid #eeeeee",
                paddingTop: "14px",
                margin: "4px 0 0",
                textAlign: "center",
                color: "#777777",
                fontSize: "14px",
              }}
            >
              สถานะจะอัปเดตอัตโนมัติ ไม่ต้องกดรีเฟรช
            </p>
          </section>
        )}

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "20px 16px",
            boxShadow: "0 3px 14px rgba(0, 0, 0, 0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <h2
              style={{
                fontSize: "21px",
                margin: 0,
              }}
            >
              คิวของวันนี้
            </h2>

            <span
  className="today-order-count"
  style={{
    backgroundColor: "#ffffff",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "bold",
  }}
>
  {todayOrders.length} ออเดอร์
</span>
          </div>

          {loading ? (
            <p style={{ color: "#666666" }}>
              กำลังโหลดรายการคิว...
            </p>
          ) : visibleQueueOrders.length === 0 ? (
            <p style={{ color: "#666666" }}>
              วันนี้ยังไม่มีออเดอร์
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "9px",
              }}
            >
              {visibleQueueOrders.map((order) => {
                const isYourOrder =
                  selectedOrder?.id === order.id;

                return (
                  <div
                    key={order.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      backgroundColor: isYourOrder
                        ? "#fff3e8"
                        : "#f7f7f7",
                      border: isYourOrder
                        ? "2px solid #ff6600"
                        : "1px solid #eeeeee",
                      borderRadius: "12px",
                      padding: "13px",
                    }}
                  >
                    <div>
                      <strong
  className="queue-number-text"
  style={{
    fontSize: "22px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
  }}
>
  หมายเลขคิว {order.queueNumber}
</strong> 

                      {isYourOrder && (
                        <div
                          style={{
                            color: "#d94f00",
                            fontSize: "13px",
                            fontWeight: "bold",
                            marginTop: "3px",
                          }}
                        >
                          คิวของคุณ
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        backgroundColor: getStatusBackground(
                          order.status
                        ),
                        color: getStatusColor(order.status),
                        padding: "7px 9px",
                        borderRadius: "999px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      {getStatusEmoji(order.status)}{" "}
                      {getStatusText(order.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {searchedText && !selectedOrder && !searchMessage && (
          <p
            style={{
              textAlign: "center",
              color: "#777777",
              marginTop: "14px",
            }}
          >
            ผลการค้นหา: {searchedText}
          </p>
        )}
            </div>

      <style jsx global>{`
        .track-page {
          background: #0d0d0d !important;
          color: #ffffff !important;
        }

        .track-page > div > header {
          background: #111111 !important;
          border: 2px solid #ff5c00 !important;
          box-shadow: 0 4px 18px rgba(255, 92, 0, 0.2) !important;
        }

        .track-page section {
          background: #241212 !important;
          border: 2px solid #5e2020 !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
        }

        .track-page h1,
        .track-page h2,
        .track-page h3,
        .track-page strong {
          color: #ffffff !important;
        }

        .track-page p {
          color: #eeeeee !important;
        }

        .track-page input {
          background: #ffffff !important;
          color: #111111 !important;
          caret-color: #111111 !important;
          border: 2px solid #ff5c00 !important;
        }

        .track-page input::placeholder {
          color: #777777 !important;
          opacity: 1;
        }

        .track-page button {
          background: #ff5c00 !important;
          color: #ffffff !important;
          border: none !important;
          box-shadow: 0 3px 10px rgba(255, 92, 0, 0.25) !important;
        }

        .track-page button:active {
          transform: scale(0.98);
        }

        .track-page section > div[style*="background-color: rgb(245"] {
          background: #321818 !important;
        }

        .track-page section > div[style*="background-color: #f5"] {
          background: #321818 !important;
        }
          .track-page section div[style*="background-color: rgb(247, 247, 247)"],
.track-page section div[style*="background-color: #f7f7f7"],
.track-page section div[style*="background-color: rgb(255, 243, 232)"],
.track-page section div[style*="background-color: #fff3e8"] {
  color: #111111 !important;
}

.track-page section div[style*="background-color: rgb(247, 247, 247)"] strong,
.track-page section div[style*="background-color: #f7f7f7"] strong,
.track-page section div[style*="background-color: rgb(255, 243, 232)"] strong,
.track-page section div[style*="background-color: #fff3e8"] strong {
  color: #111111 !important;
}

.track-page section div[style*="background-color: rgb(247, 247, 247)"] div,
.track-page section div[style*="background-color: #f7f7f7"] div,
.track-page section div[style*="background-color: rgb(255, 243, 232)"] div,
.track-page section div[style*="background-color: #fff3e8"] div {
  color: #111111;
}
  .track-page .queue-number-text {
  color: #ff6600 !important;
  font-weight: 800 !important;
}
 .track-page .today-order-count {
  color: #ff6600 !important;
  background-color: #ffffff !important;
  border: 1px solid #ff6600 !important;
  font-weight: 800 !important;
} 
  .track-page .status-description-text {
  color: #ff6600 !important;
  font-weight: 700 !important;
}

.track-page .queue-summary-box{
    background:#FFF7D6 !important;
    border:2px solid #FFB347 !important;
}

.track-page .queue-summary-box p{
    color:#E46A00 !important;
    font-size:16px !important;
    font-weight:700 !important;
}

.track-page .queue-summary-box strong{
    color:#FF6600 !important;
    font-size:34px !important;
    font-weight:900 !important;
}

.track-page .queue-summary-box span{
    color:#E46A00 !important;
    font-size:22px !important;
    font-weight:700 !important;
}
  color: #ff6600 !important;
}

.track-page .queue-summary-box strong {
  font-weight: 900 !important;
}
      `}</style>
    </main>
  );
}