import { MenuItem } from "../types/menu";

export type CartItem = MenuItem & {
  quantity: number;
};

type CartProps = {
  cart: CartItem[];
  totalPrice: number;
  onClose: () => void;
  onIncrease: (id: number) => void;
  onDecrease: (id: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
};

export default function Cart({
  cart,
  totalPrice,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
}: CartProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#222222",
          borderRadius: "16px",
          padding: "22px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "85vh",
          overflowY: "auto",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0 }}>ตะกร้าสินค้า</h2>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "white",
              border: "1px solid #777777",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            ปิด
          </button>
        </div>

        {cart.length === 0 ? (
          <p style={{ color: "#cccccc" }}>ยังไม่มีสินค้าในตะกร้า</p>
        ) : (
          <>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  borderBottom: "1px solid #444444",
                  padding: "14px 0",
                }}
              >
                <h3 style={{ margin: "0 0 10px" }}>{item.name}</h3>

                <p style={{ margin: "0 0 10px" }}>
                  {item.price * item.quantity} บาท
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() => onDecrease(item.id)}
                    style={quantityButtonStyle}
                  >
                    −
                  </button>

                  <strong>{item.quantity}</strong>

                  <button
                    onClick={() => onIncrease(item.id)}
                    style={quantityButtonStyle}
                  >
                    +
                  </button>

                  <button
                    onClick={() => onRemove(item.id)}
                    style={{
                      marginLeft: "auto",
                      background: "#b91c1c",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: "20px",
                fontSize: "22px",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>ยอดรวม</span>
              <span>{totalPrice} บาท</span>
            </div>

            <button
              onClick={onCheckout}
              style={{
                width: "100%",
                marginTop: "20px",
                background: "#ff6600",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "14px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ไปหน้าสั่งซื้อ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const quantityButtonStyle = {
  width: "36px",
  height: "36px",
  background: "#444444",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "20px",
  cursor: "pointer",
};