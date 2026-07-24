import { MenuItem } from "../types/menu";

type MenuCardProps = {
  menu: MenuItem;
  onAdd: (menu: MenuItem) => void;
};

export default function MenuCard({
  menu,
  onAdd,
}: MenuCardProps) {
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
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          minWidth: 0,
        }}
      >
        {menu.imageUrl ? (
          <img
            src={menu.imageUrl}
            alt={menu.name}
            style={{
              width: "90px",
              height: "90px",
              objectFit: "cover",
              borderRadius: "12px",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "12px",
              background: "#333333",
              color: "#aaaaaa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            ไม่มีรูป
          </div>
        )}

        <div
          style={{
            minWidth: 0,
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "18px",
              overflowWrap: "anywhere",
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
  {(menu.allowedOrderTypes?.shabu ?? true) && (
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

  {(menu.allowedOrderTypes?.dry ?? true) && (
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

  {(menu.allowedOrderTypes?.fried ?? true) && (
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
        onClick={() => onAdd(menu)}
        style={{
          background: "#ff6600",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "12px 18px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        เพิ่ม
      </button>
    </div>
  );
}