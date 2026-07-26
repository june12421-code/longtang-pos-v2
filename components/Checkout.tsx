import {
  orderTypes,
  soupOptions,
  spicyOptions,
} from "../data/options";
type CheckoutProps = {
  customerName: string;
  customerPhone: string;
  customerLine: string;
  customerAddress: string;
  customerNote: string;
  selectedSoup: string;
onChangeSoup: (value: string) => void;
selectedSpicy: string;
onChangeSpicy: (value: string) => void;
paymentMethod: string;
onChangePaymentMethod: (value: string) => void;
  orderType: string;
onChangeOrderType: (value: string) => void;
malaSauceCount: number;
selectableSauceCount: number;
sauces: {
  sesame: number;
  suki: number;
};

onChangeSauces: (
  value: {
    sesame: number;
    suki: number;
  }
) => void;
  totalPrice: number;

  incompatibleItems: string[];
hasIncompatibleItems: boolean;

onRemoveIncompatibleItems: () => void;
onConvertToShabu: () => void;
onConvertToDry: () => void;

  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeLine: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onChangeNote: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
};

export default function Checkout({
  customerName,
  customerPhone,
  customerLine,
  customerAddress,
  customerNote,
  selectedSoup,
onChangeSoup,
selectedSpicy,
onChangeSpicy,
paymentMethod,
onChangePaymentMethod,
orderType,
onChangeOrderType,
malaSauceCount,
selectableSauceCount,
sauces,
onChangeSauces,
  totalPrice,
  incompatibleItems,
hasIncompatibleItems,
onRemoveIncompatibleItems,
onConvertToShabu,
onConvertToDry,
  onChangeName,
  onChangePhone,
  onChangeLine,
  onChangeAddress,
  onChangeNote,
  onBack,
  onConfirm,
}: CheckoutProps) {
  const soupsWithoutSpicy = [
  "ซุปกระดูกนม",
  "กระดูกนม",
  "น้ำดำ",
  "น้ำใส",
];

const shouldSelectSpicy =
  orderType !== "shabu" ||
  !soupsWithoutSpicy.includes(selectedSoup);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.78)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        zIndex: 1100,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#222222",
          color: "white",
          borderRadius: "16px",
          padding: "22px",
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
          <h2 style={{ margin: 0 }}>ข้อมูลการสั่งซื้อ</h2>

          <button
            onClick={onBack}
            style={{
              background: "transparent",
              color: "white",
              border: "1px solid #777777",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            กลับ
          </button>
        </div>
<label style={labelStyle}>
  ประเภทออเดอร์

  <select
    value={orderType}
    onChange={(event) =>
      onChangeOrderType(event.target.value)
    }
    style={inputStyle}
  >
    <option value="">กรุณาเลือกประเภทออเดอร์</option>

    {orderTypes.map((type) => (
      <option key={type.id} value={type.id}>
        {type.name} ขั้นต่ำ {type.minimumPrice} บาท
      </option>
    ))}
  </select>
</label>

{orderType === "shabu" && (
  <label style={labelStyle}>
    เลือกน้ำซุป

    <select
      value={selectedSoup}
      onChange={(event) =>
        onChangeSoup(event.target.value)
      }
      style={inputStyle}
    >
      <option value="">กรุณาเลือกน้ำซุป</option>

      {soupOptions.map((soup) => (
        <option key={soup} value={soup}>
          {soup}
        </option>
      ))}
    </select>
  </label>
)}

{shouldSelectSpicy ? (
  <label style={labelStyle}>
    ระดับความเผ็ด

    <select
      value={selectedSpicy}
      onChange={(event) =>
        onChangeSpicy(event.target.value)
      }
      style={inputStyle}
    >
      <option value="">กรุณาเลือกระดับความเผ็ด</option>

      {spicyOptions.map((spicy) => (
        <option key={spicy} value={spicy}>
          {spicy}
        </option>
      ))}
    </select>
  </label>
) : (
  <div
    style={{
      marginBottom: "16px",
      padding: "12px",
      borderRadius: "10px",
      background: "#263238",
      border: "1px solid #607d8b",
      color: "#eceff1",
      fontSize: "15px",
    }}
  >
    ℹ️ น้ำซุปนี้ไม่มีตัวเลือกระดับความเผ็ด
  </div>
)}
<label style={labelStyle}>
  วิธีชำระเงิน

  <select
    value={paymentMethod}
    onChange={(event) =>
      onChangePaymentMethod(event.target.value)
    }
    style={inputStyle}
  >
    <option value="cash">💵 เงินสด</option>
    <option value="transfer">📱 โอนเงิน</option>
    <option value="thai-support">🏦 ไทยช่วยไทย</option>
  </select>
</label>
<label style={labelStyle}>
          ชื่อลูกค้า
          <input
            value={customerName}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder="กรอกชื่อลูกค้า"
            style={inputStyle}
          />
        </label>

      <label style={labelStyle}>
  เบอร์โทร

  <input
    value={customerPhone}
    onChange={(event) => onChangePhone(event.target.value)}
    placeholder="กรอกเบอร์โทร"
    inputMode="tel"
    style={inputStyle}
  />
</label>

<label style={labelStyle}>
  LINE (ชื่อ หรือ ID)

  <input
    value={customerLine}
    onChange={(event) => onChangeLine(event.target.value)}
    placeholder="เช่น @097hokkw หรือ line123"
    style={inputStyle}
  />
</label>

        <label style={labelStyle}>
          ที่อยู่จัดส่ง
          <textarea
            value={customerAddress}
            onChange={(event) => onChangeAddress(event.target.value)}
            placeholder="หอพัก ตึก ห้อง จุดสังเกต"
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </label>

        <label style={labelStyle}>
          หมายเหตุ
          <textarea
            value={customerNote}
            onChange={(event) => onChangeNote(event.target.value)}
            placeholder="เช่น ไม่เผ็ด ไม่ใส่ผัก"
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </label>
{hasIncompatibleItems && (
  <div
    style={{
      marginTop: "16px",
      marginBottom: "18px",
      background: "#4b1113",
      border: "2px solid #ef4444",
      borderRadius: "12px",
      padding: "16px",
      color: "#fecaca",
    }}
  >
    <div
      style={{
        fontWeight: "bold",
        fontSize: "18px",
        marginBottom: "10px",
      }}
    >
      ⚠️ พบเมนูที่ไม่รองรับประเภทอาหารนี้
    </div>

    <div
      style={{
        marginBottom: "8px",
      }}
    >
      เมนูที่ต้องแก้ไข:
    </div>

    <ul
      style={{
        marginTop: 0,
        marginBottom: "16px",
        paddingLeft: "22px",
      }}
    >
      {incompatibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>

    <div
      style={{
        fontWeight: "bold",
        marginBottom: "10px",
      }}
    >
      เลือกวิธีแก้ไขออเดอร์
    </div>

    <div
      style={{
        display: "grid",
        gap: "10px",
      }}
    >
      <button
        type="button"
        onClick={onRemoveIncompatibleItems}
        style={{
          width: "100%",
          background: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        🗑️ ลบเมนูที่ทำไม่ได้ออกจากตะกร้า
      </button>

      <button
        type="button"
        onClick={onConvertToShabu}
        style={{
          width: "100%",
          background: "#ea580c",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        🍲 เปลี่ยนเป็นชาบูหม่าล่า
      </button>

      <button
        type="button"
        onClick={onConvertToDry}
        style={{
          width: "100%",
          background: "#d97706",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        🥢 เปลี่ยนเป็นหม่าล่าผัดแห้ง
      </button>

      <button
        type="button"
        onClick={onBack}
        style={{
          width: "100%",
          background: "#374151",
          color: "white",
          border: "1px solid #6b7280",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        ↩️ กลับไปเปลี่ยนสินค้าเอง
      </button>
    </div>
  </div>
)}
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "22px",
            fontWeight: "bold",
          }}
        >
          <span>ยอดรวม</span>
          <span>{totalPrice} บาท</span>
        </div>
        {malaSauceCount > 0 && (
  <div
    style={{
      marginTop: "14px",
      background: "#3a1f1f",
      border: "1px solid #ff6600",
      borderRadius: "10px",
      padding: "12px",
      color: "#ffb38a",
      fontSize: "18px",
      fontWeight: "bold",
      textAlign: "center",
    }}
  >
    🌶️ ได้ซอสหม่าล่า {malaSauceCount} ถ้วย
  </div>
)}

{selectableSauceCount > 0 && (
  <div
    style={{
      marginTop: "10px",
      background: "#3b2a13",
      border: "1px solid #ff9900",
      borderRadius: "10px",
      padding: "14px",
      color: "#ffd27a",
    }}
  >
    <div
      style={{
        fontSize: "18px",
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: "12px",
      }}
    >
      🥣 เลือกน้ำจิ้มได้รวม {selectableSauceCount} ถ้วย
    </div>

    <div style={{ marginBottom: "10px" }}>
      เลือกแล้ว {sauces.sesame + sauces.suki} / {selectableSauceCount} ถ้วย
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
      }}
    >
      <span>น้ำจิ้มงา</span>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          onClick={() =>
            onChangeSauces({
              ...sauces,
              sesame: Math.max(0, sauces.sesame - 1),
            })
          }
        >
          −
        </button>

        <span>{sauces.sesame}</span>

        <button
          type="button"
          disabled={
            sauces.sesame + sauces.suki >= selectableSauceCount
          }
          onClick={() =>
            onChangeSauces({
              ...sauces,
              sesame: sauces.sesame + 1,
            })
          }
        >
          +
        </button>
      </div>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>น้ำจิ้มสุกี้</span>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          onClick={() =>
            onChangeSauces({
              ...sauces,
              suki: Math.max(0, sauces.suki - 1),
            })
          }
        >
          −
        </button>

        <span>{sauces.suki}</span>

        <button
          type="button"
          disabled={
            sauces.sesame + sauces.suki >= selectableSauceCount
          }
          onClick={() =>
            onChangeSauces({
              ...sauces,
              suki: sauces.suki + 1,
            })
          }
        >
          +
        </button>
      </div>
    </div>
  </div>
)}
        <button
  type="button"
  disabled={
  hasIncompatibleItems ||
  (
    selectableSauceCount > 0 &&
    sauces.sesame + sauces.suki < selectableSauceCount
  )
}
  onClick={() => {
    const selectedSauceTotal =
      sauces.sesame + sauces.suki;

    if (
  selectableSauceCount > 0 &&
  selectedSauceTotal < selectableSauceCount
) {
      alert(
        `กรุณาเลือกน้ำจิ้มให้ครบ ${selectableSauceCount} ถ้วย`
      );
      return;
    }

    onConfirm();
  }}
  style={{
    width: "100%",
    marginTop: "20px",
    background:
  sauces.sesame + sauces.suki < selectableSauceCount ||
  hasIncompatibleItems
        ? "#666666"
        : "#ff6600",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "18px",
    fontWeight: "bold",
    cursor:
      sauces.sesame + sauces.suki < selectableSauceCount
        ? "not-allowed"
        : "pointer",
  }}
>
{hasIncompatibleItems
  ? "⛔ มีเมนูที่ไม่รองรับประเภทอาหาร"
  : selectableSauceCount > 0 &&
    sauces.sesame + sauces.suki < selectableSauceCount
  ? `กรุณาเลือกน้ำจิ้มอีก ${
      selectableSauceCount -
      (sauces.sesame + sauces.suki)
    } ถ้วย`
  : "ยืนยันคำสั่งซื้อ"}
</button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "grid",
  gap: "8px",
  marginBottom: "16px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#111111",
  color: "white",
  border: "1px solid #555555",
  borderRadius: "10px",
  padding: "12px",
  fontSize: "16px",
};