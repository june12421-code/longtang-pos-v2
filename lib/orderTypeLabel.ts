export function getOrderTypeLabel(
  orderType?: string
): string {
  switch (orderType) {
    case "shabu":
      return "ชาบู";

    case "dry":
      return "ผัดแห้ง";

    case "fried":
      return "หม่าล่าทอด";

    default:
      return orderType?.trim() || "ไม่ระบุ";
  }
}