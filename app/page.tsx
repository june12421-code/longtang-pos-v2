 "use client";

import { useEffect, useState } from "react";
import { getMenus } from "../services/menuService";
import {
  getMinimumPrice,
  getSauceReward,
} from "../data/options";
import { MenuItem } from "../types/menu";
import MenuCard from "../components/MenuCard";
import Cart from "../components/Cart";
import Checkout from "../components/Checkout";
import { createOrder } from "../services/orderService";
import {
  ShopStatus,
  subscribeShopSettings,
} from "../services/shopSettingsService";

type CartItem = MenuItem & {
  quantity: number;
};



export default function Home() {
const [cart, setCart] = useState<CartItem[]>([]);
const [menus, setMenus] = useState<MenuItem[]>([]);
const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
const [searchText, setSearchText] = useState("");
const [isCartOpen, setIsCartOpen] = useState(false);
const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
const [customerName, setCustomerName] = useState("");
const [customerPhone, setCustomerPhone] = useState("");
const [customerLine, setCustomerLine] = useState("");
useEffect(() => {
  const savedName = localStorage.getItem("lt_customer_name");
  const savedPhone = localStorage.getItem("lt_customer_phone");
  const savedLine = localStorage.getItem("lt_customer_line");

  if (savedName) {
    setCustomerName(savedName);
  }

  if (savedPhone) {
    setCustomerPhone(savedPhone);
  }

  if (savedLine) {
    setCustomerLine(savedLine);
  }
}, []);
const [customerAddress, setCustomerAddress] = useState("");
const [customerNote, setCustomerNote] = useState("");
const [orderType, setOrderType] = useState("");
const [selectedSoup, setSelectedSoup] = useState("");
const [selectedSpicy, setSelectedSpicy] = useState("");
const [paymentMethod, setPaymentMethod] = useState("cash");
const [sauces, setSauces] = useState({
  sesame: 0,
  suki: 0,
});
const [showWelcome, setShowWelcome] = useState(true);
const [shopStatus, setShopStatus] =
  useState<ShopStatus>("open");

const [shopMessage, setShopMessage] =
  useState("");
 useEffect(() => {
  const unsubscribe =
    subscribeShopSettings((settings) => {
      setShopStatus(settings.status);
      setShopMessage(settings.message);
    });

  return () => unsubscribe();
}, []); 
useEffect(() => {
  async function loadMenus() {
    try {
      const menuData = await getMenus();

      const availableMenus = menuData
        .filter((menu) => menu.available !== false)
        .sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );

      setMenus(availableMenus);
    } catch (error) {
      console.error("โหลดเมนูไม่สำเร็จ:", error);
    }
  }

  loadMenus();
}, []);
  function addToCart(menu: MenuItem) {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === menu.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === menu.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...menu, quantity: 1 }];
    });
  }

  function increaseQuantity(id: number) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decreaseQuantity(id: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(id: number) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== id)
    );
  }

  const totalQuantity = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalPrice = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
const sauceReward = getSauceReward(
  orderType,
  totalPrice
);
const incompatibleItems = cart.filter((item) => {
  if (!orderType) {
    return false;
  }

  const allowedOrderTypes =
    item.allowedOrderTypes ?? {
      shabu: true,
      dry: true,
      fried: true,
    };

  if (orderType === "shabu") {
    return !allowedOrderTypes.shabu;
  }

  if (orderType === "dry") {
    return !allowedOrderTypes.dry;
  }

  if (orderType === "fried") {
    return !allowedOrderTypes.fried;
  }

  return false;
});

const hasIncompatibleItems = incompatibleItems.length > 0;
useEffect(() => {
  const selectedSauceTotal =
    sauces.sesame + sauces.suki;

  if (
    selectedSauceTotal >
    sauceReward.selectableSauce
  ) {
    setSauces({
      sesame: 0,
      suki: 0,
    });
  }
}, [
  sauceReward.selectableSauce,
  sauces.sesame,
  sauces.suki,
]);
const categories = [
  "ทั้งหมด",
  ...Array.from(
    new Set(
      menus.map((menu) => menu.category || "ทั่วไป")
    )
  ),
];

const filteredMenus = menus.filter((menu) => {
  const matchCategory =
    selectedCategory === "ทั้งหมด" ||
    (menu.category || "ทั่วไป") === selectedCategory;

  const matchSearch = menu.name
    .toLowerCase()
    .includes(searchText.toLowerCase());

  return matchCategory && matchSearch;
});
if (shopStatus !== "open") {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111111",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "80px",
            marginBottom: "20px",
          }}
        >
          {shopStatus === "closed"
            ? "🔴"
            : "🟠"}
        </div>

        <h1
          style={{
            color: "#ff6600",
          }}
        >
          {shopStatus === "closed"
            ? "ร้านปิด"
            : "หยุดรับออเดอร์ออนไลน์"}
        </h1>

        <p
          style={{
            marginTop: "18px",
            lineHeight: 1.8,
            color: "#dddddd",
          }}
        >
          {shopMessage}
        </p>
      </div>
    </main>
  );
}
 if (showWelcome) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#111111,#1d1d1d)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: "80px",
            marginBottom: "20px",
          }}
        >
          🍲
        </div>

        <h1
          style={{
            color: "#ff6600",
            fontSize: "40px",
            marginBottom: "10px",
          }}
        >
          หลงทั่ง
        </h1>

        <p
          style={{
            color: "#dddddd",
            fontSize: "18px",
            lineHeight: 1.8,
            marginBottom: "35px",
          }}
        >
          ชาบูเสียบไม้
          <br />
          หม่าล่าทอด
          <br />
          หม่าล่าผัดแห้ง
        </p>

        <button
          onClick={() => setShowWelcome(false)}
          style={{
            width: "100%",
            padding: "18px",
            background: "#ff6600",
            color: "white",
            border: "none",
            borderRadius: "14px",
            fontSize: "22px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          🍜 เริ่มสั่งอาหาร
        </button>

        <p
          style={{
            marginTop: "20px",
            color: "#999999",
            fontSize: "14px",
          }}
        >
          สแกน QR แล้วกดปุ่มเพื่อเริ่มสั่งอาหาร
        </p>
      </div>
    </main>
  );
}

return ( 
    <main
      style={{
        minHeight: "100vh",
        background: "#111111",
        color: "white",
        fontFamily: "sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                color: "#ff6600",
                fontSize: "32px",
                margin: 0,
              }}
            >
              LongTang หม่าล่าชาบู&หม่าทอด ม.น ประตู4
            </h1>

            <p style={{ marginTop: "6px", color: "#cccccc" }}>
              เลือกใส่ตะกร้า
            </p>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              background: "#ff6600",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "12px 18px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ตะกร้า ({totalQuantity})
          </button>
        </header>

        <h2 style={{ marginBottom: "16px" }}>เมนูอาหาร</h2>
       <input
  type="text"
  placeholder="🔍 ค้นหาเมนู..."
  value={searchText}
  onChange={(e) => setSearchText(e.target.value)}
  style={{
    width: "100%",
    padding: "14px",
    marginBottom: "16px",
    borderRadius: "12px",
    border: "none",
    fontSize: "16px",
    background: "#222",
    color: "white",
    outline: "none",
  }}
/> 
<div
  style={{
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    marginBottom: "20px",
    paddingBottom: "8px",
  }}
>
  {categories.map((category) => (
    <button
      key={category}
      onClick={() => setSelectedCategory(category)}
      style={{
        padding: "10px 18px",
        border: "none",
        borderRadius: "999px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontWeight: "bold",
        background:
          selectedCategory === category
            ? "#ff6600"
            : "#333333",
        color: "white",
      }}
    >
      {category}
    </button>
  ))}
</div>
        <section
  style={{
    display: "grid",
    gap: "14px",
  }}
>
  {filteredMenus.length === 0 ? (
  <div
    style={{
      textAlign: "center",
      padding: "40px",
      color: "#cccccc",
    }}
  >
    ไม่พบเมนูในหมวดนี้
  </div>
) : (
  filteredMenus.map((menu) => (
    <MenuCard
      key={menu.id}
      menu={menu}
      onAdd={addToCart}
    />
  ))
)}
</section>
      </div>

      {isCartOpen && (
  <Cart
    cart={cart}
    totalPrice={totalPrice}
    onClose={() => setIsCartOpen(false)}
    onIncrease={increaseQuantity}
    onDecrease={decreaseQuantity}
    onRemove={removeItem}
    onCheckout={() => {
      setIsCartOpen(false);
      setIsCheckoutOpen(true);
    }}
  />
)}
{isCheckoutOpen && (
  <Checkout
    customerName={customerName}
    customerPhone={customerPhone}
    customerLine={customerLine}
    customerAddress={customerAddress}
    customerNote={customerNote}
    totalPrice={totalPrice}
  incompatibleItems={incompatibleItems.map(
  (item) => item.name
)}
hasIncompatibleItems={hasIncompatibleItems}

onRemoveIncompatibleItems={() => {
  const incompatibleItemIds = new Set(
    incompatibleItems.map((item) => item.id)
  );

  setCart((currentCart) =>
    currentCart.filter(
      (item) => !incompatibleItemIds.has(item.id)
    )
  );
}}

onConvertToShabu={() => {
  setOrderType("shabu");
  setSelectedSoup("");

  setSauces({
    sesame: 0,
    suki: 0,
  });
}}

onConvertToDry={() => {
  setOrderType("dry");
  setSelectedSoup("");

  setSauces({
    sesame: 0,
    suki: 0,
  });
}}

orderType={orderType}  
onChangeOrderType={(value) => {
  setOrderType(value);

  setSelectedSoup("");

  setSauces({
    sesame: 0,
    suki: 0,
  });
}}
    selectedSoup={selectedSoup}
onChangeSoup={(value) => {
  setSelectedSoup(value);

  const soupsWithoutSpicy = [
    "ซุปกระดูกนม",
    "กระดูกนม",
    "น้ำดำ",
    "น้ำใส",
  ];

  if (soupsWithoutSpicy.includes(value)) {
    setSelectedSpicy("");
  }
}}
selectedSpicy={selectedSpicy}
onChangeSpicy={setSelectedSpicy}
paymentMethod={paymentMethod}
onChangePaymentMethod={setPaymentMethod}
malaSauceCount={sauceReward.malaSauce}
selectableSauceCount={sauceReward.selectableSauce}
sauces={sauces}
onChangeSauces={setSauces}
onChangeName={setCustomerName}
    onChangePhone={setCustomerPhone}
    onChangeLine={setCustomerLine}
    onChangeAddress={setCustomerAddress}
    onChangeNote={setCustomerNote}
    onBack={() => {
  setIsCheckoutOpen(false);
  setIsCartOpen(true);

  setSauces({
    sesame: 0,
    suki: 0,
  });
}}
    onConfirm={async () => {
      if (hasIncompatibleItems) {
  alert("มีเมนูที่ไม่รองรับประเภทอาหารที่เลือก");
  return;
}
  try {
    if (!customerName.trim()) {
      alert("กรุณากรอกชื่อลูกค้า");
      return;
    }

    if (!customerPhone.trim()) {
      alert("กรุณากรอกเบอร์โทร");
      return;
    }

    if (!customerAddress.trim()) {
      alert("กรุณากรอกที่อยู่จัดส่ง");
      return;
    }
if (!orderType) {
  alert("กรุณาเลือกประเภทออเดอร์");
  return;
}
if (orderType === "shabu" && !selectedSoup) {
  alert("กรุณาเลือกน้ำซุป");
  return;
}const soupsWithoutSpicy = [
  "ซุปกระดูกนม",
  "กระดูกนม",
  "น้ำดำ",
  "น้ำใส",
];

const requiresSpicy =
  orderType !== "shabu" ||
  !soupsWithoutSpicy.includes(selectedSoup);

if (requiresSpicy && !selectedSpicy) {
  alert("กรุณาเลือกระดับความเผ็ด");
  return;
}
const minimumPrice = getMinimumPrice(orderType);

if (totalPrice < minimumPrice) {
  alert(
    `ยอดขั้นต่ำสำหรับเมนูนี้คือ ${minimumPrice} บาท`
  );
  return;
}
 const orderResult = await createOrder({
  customerName,
  customerPhone,
  customerLine,
  customerAddress,
  customerNote,
  orderType,
  selectedSoup,
  selectedSpicy,
  paymentMethod,
  sauces,
  malaSauceCount: sauceReward.malaSauce,
  selectableSauceCount: sauceReward.selectableSauce,
  items: cart,
  totalPrice,
});

alert(
  `รับคำสั่งซื้อแล้ว\nเลขคิว: ${orderResult.queueNumber}\nยอดรวม: ${totalPrice} บาท`
);   
localStorage.setItem(
  "lt_customer_name",
  customerName
);

localStorage.setItem(
  "lt_customer_phone",
  customerPhone
);

localStorage.setItem(
  "lt_customer_line",
  customerLine
);
    setCart([]);
    setIsCheckoutOpen(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerNote("");
    setCustomerLine("");
    setOrderType("");
setSelectedSoup("");
setSelectedSpicy("");

setSauces({
  sesame: 0,
  suki: 0,
});
  } catch (error) {
    console.error(error);
    alert("บันทึกออเดอร์ไม่สำเร็จ กรุณาลองใหม่");
  }
}}
  />
)}
    </main>
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