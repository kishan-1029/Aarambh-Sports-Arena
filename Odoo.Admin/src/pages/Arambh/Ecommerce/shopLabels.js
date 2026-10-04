/** Shared display labels for the Pro Shop admin screens. */

export const ORDER_STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_TONE = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  ready_for_pickup: "success",
  out_for_delivery: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
};

export const PAYMENT_STATUS_LABEL = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Part refunded",
};

export const PAYMENT_STATUS_TONE = {
  pending: "warning",
  paid: "success",
  failed: "danger",
  refunded: "neutral",
  partially_refunded: "warning",
};

export const PAYMENT_METHOD_LABEL = {
  online: "Online",
  upi: "UPI",
  card: "Card",
  pay_at_club: "Pay at club",
  cash_on_delivery: "Cash on delivery",
};

export const FULFILMENT_LABEL = {
  pickup: "Club pickup",
  delivery: "Delivery",
};

export const STOCK_STATUS_LABEL = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  not_tracked: "Not tracked",
};

export const STOCK_STATUS_TONE = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  not_tracked: "neutral",
};

export const MOVEMENT_TYPE_LABEL = {
  stock_in: "Stock in",
  sale: "Sale",
  adjustment: "Adjustment",
  return: "Return",
  cancellation: "Cancellation",
  damage: "Damage",
};

export const ADJUST_REASONS = [
  "New shipment",
  "Damaged item",
  "Physical stock correction",
  "Return",
  "Other",
];

/** Rupee string → integer paise, for money inputs in admin forms. */
export function rupeesToPaise(value) {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise) {
  if (paise == null) return "";
  return String(Number(paise) / 100);
}
