export const orderTypes = [
  {
    id: "shabu",
    name: "ชาบูเสียบไม้ / หม่าล่าทั่ง",
    minimumPrice: 50,
  },
  {
    id: "dry",
    name: "หม่าล่าผัดแห้ง",
    minimumPrice: 50,
  },
  {
    id: "fried",
    name: "หม่าล่าทอด",
    minimumPrice: 40,
  },
] as const;

export const soupOptions = [
  "หม่าล่า",
  "หม่าล่านม",
  "หม่าล่าน้ำดำ",
  "ซุปกระดูกนม",
  "น้ำดำ",
  "ต้มยำ",
  "แจ่วฮ้อน",
  "น้ำใส",
] as const;

export const sauceOptions = [
  "น้ำจิ้มงา",
  "น้ำจิ้มสุกี้",
] as const;

export const friedSauceOption = "ซอสหม่าล่า";

export const spicyOptions = [
  "ไม่เผ็ด",
  "เผ็ดน้อย",
  "เผ็ดกลาง",
  "เผ็ดมาก",
] as const;

export const friedOptions = [
  "โรยผง แยกซอส",
  "ทาซอส โรยผง",
] as const;

export const fulfillmentOptions = [
  {
    id: "pickup",
    name: "รับหน้าร้าน",
  },
  {
    id: "delivery",
    name: "ส่งฟรี Delivery",
  },
] as const;

export const paymentOptions = [
  {
    id: "cash",
    name: "เงินสด",
  },
  {
    id: "transfer",
    name: "เงินโอน / PromptPay",
  },
  {
    id: "thai-plus",
    name: "ไทยช่วยไทย",
  },
] as const;

export function getMinimumPrice(orderType: string): number {
  const selectedType = orderTypes.find(
    (type) => type.id === orderType
  );

  return selectedType?.minimumPrice ?? 0;
}

export function getSauceReward(
  orderType: string,
  totalPrice: number
) {
  // ชาบู / ผัดแห้ง
  if (orderType === "shabu" || orderType === "dry") {
    return {
      malaSauce: 0,
      selectableSauce: Math.floor(totalPrice / 50),
    };
  }

  // หม่าล่าทอด
  if (orderType === "fried") {
    if (totalPrice < 40) {
      return {
        malaSauce: 0,
        selectableSauce: 0,
      };
    }

    // 40–99 บาท
    if (totalPrice < 100) {
      return {
        malaSauce: 1,
        selectableSauce: 0,
      };
    }

    // 100 บาทขึ้นไป
    return {
      malaSauce: 2,
      selectableSauce: Math.floor((totalPrice - 100) / 50),
    };
  }

  return {
    malaSauce: 0,
    selectableSauce: 0,
  };
}