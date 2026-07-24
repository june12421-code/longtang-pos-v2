type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type OrderReceiptProps = {
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    orderType: string;
    selectedSoup: string;
    selectedSpicy: string;
    totalPrice: number;
    items: OrderItem[];
    sauces: {
      sesame: number;
      suki: number;
    };
    malaSauceCount: number;
  };
};

export default function OrderReceipt({
  order,
}: OrderReceiptProps) {
  return (
    <div
      style={{
        width: "80mm",
        padding: "10px",
        fontFamily: "monospace",
        color: "#000",
        background: "#fff",
      }}
    >
      <h2 style={{ textAlign: "center", margin: 0 }}>
        หลงทั่ง
      </h2>

      <p style={{ textAlign: "center", margin: "4px 0 12px" }}>
        ใบรับออเดอร์
      </p>

      <hr />

      <p>เลขที่ : {order.id}</p>

      <p>ลูกค้า : {order.customerName}</p>

      <p>โทร : {order.customerPhone}</p>

      <p>ประเภท : {order.orderType}</p>

      <hr />

      {order.items.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            {item.name} × {item.quantity}
          </span>

          <span>
            {item.price * item.quantity}
          </span>
        </div>
      ))}

      <hr />

      <p>รวม {order.totalPrice} บาท</p>

      <p>ซุป : {order.selectedSoup}</p>

      <p>เผ็ด : {order.selectedSpicy}</p>

      <p>งา : {order.sauces.sesame}</p>

      <p>สุกี้ : {order.sauces.suki}</p>

      <p>หม่าล่า : {order.malaSauceCount}</p>
    </div>
  );
}