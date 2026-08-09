import { MenuItem } from "../types/menu";

type MenuCardProps = {
  menu: MenuItem;
  onAdd: (menu: MenuItem) => void;
};

export default function MenuCard({
  menu,
  onAdd,
}: MenuCardProps) {
  const isAvailable = menu.available !== false;

  function handleAddMenu() {
    if (!isAvailable) {
      return;
    }

    onAdd(menu);
  }

  return (
    <div
      style={{
        background: "#222222",
        borderRadius: "14px",
        padding: "14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "14px",
        border: isAvailable
          ? "1px solid transparent"
          : "1px solid #7f1d1d",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "90px",
            height: "90px",
            borderRadius: "12px",
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "#333333",
          }}
        >
          {menu.imageUrl ? (
            <img
              src={menu.imageUrl}
              alt={menu.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: isAvailable ? 1 : 0.3,
                filter: isAvailable
                  ? "none"
                  : "grayscale(65%)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#333333",
                color: "#aaaaaa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                opacity: isAvailable ? 1 : 0.35,
              }}
            >
              ไม่มีรูป
            </div>
          )}

          {!isAvailable && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "135%",
                padding: "5px 2px",
                backgroundColor:
                  "rgba(220, 38, 38, 0.95)",
                color: "#ffffff",
                textAlign: "center",
                fontSize: "10px",
                fontWeight: "bold",
                lineHeight: 1.35,
                transform:
                  "translate(-50%, -50%) rotate(-12deg)",
                boxShadow:
                  "0 2px 6px rgba(0, 0, 0, 0.35)",
                zIndex: 2,
              }}
            >
              <div>(ของหมด) ขออภัย</div>
              <div>เมนูไม่พร้อมขายชั่วคราว</div>
            </div>
          )}
        </div>

        <div
          style={{
            minWidth: 0,
            opacity: isAvailable ? 1 : 0.55,
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "18px",
              overflowWrap: "anywhere",
              color: isAvailable
                ? "#ffffff"
                : "#d1d5db",
            }}
          >
            {menu.name}
          </h3>

          {menu.category && (
            <p
              style={{
                margin: "0 0 6px",
                color: "#bbbbbb",
                fontSize: "14px",
              }}
            >
              หมวด: {menu.category}
            </p>
          )}

          <p
            style={{
              margin: 0,
              fontWeight: "bold",
              color: isAvailable
                ? "#ffffff"
                : "#9ca3af",
            }}
          >
            {menu.price} บาท
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "10px",
            }}
          >
            {(menu.allowedOrderTypes?.shabu ??
              true) && (
              <span
                style={{
                  background: "#2563eb",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  borderRadius: "999px",
                }}
              >
                🍲 ชาบู
              </span>
            )}

            {(menu.allowedOrderTypes?.dry ??
              true) && (
              <span
                style={{
                  background: "#ea580c",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  borderRadius: "999px",
                }}
              >
                🌶️ ผัดแห้ง
              </span>
            )}

            {(menu.allowedOrderTypes?.fried ??
              true) && (
              <span
                style={{
                  background: "#dc2626",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  borderRadius: "999px",
                }}
              >
                🔥 ทอด
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddMenu}
        disabled={!isAvailable}
        style={{
          background: isAvailable
            ? "#ff6600"
            : "#7f1d1d",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "12px 18px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: isAvailable
            ? "pointer"
            : "not-allowed",
          flexShrink: 0,
          opacity: isAvailable ? 1 : 0.65,
        }}
      >
        {isAvailable ? "เพิ่ม" : "ของหมด"}
      </button>
    </div>
  );
}