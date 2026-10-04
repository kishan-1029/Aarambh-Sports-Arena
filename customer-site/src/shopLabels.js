export const ORDER_STATUS_LABEL = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Being prepared',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABEL = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

export const PAYMENT_LABEL = {
  pay_at_club: 'Pay at the club',
  cash_on_delivery: 'Cash on delivery',
  online: 'Paid online',
  upi: 'UPI',
  card: 'Card',
};

export const FULFILMENT_LABEL = {
  pickup: 'Club pickup',
  delivery: 'Home delivery',
};

export function statusTone(status) {
  if (status === 'cancelled') return 'badge-danger';
  if (status === 'completed' || status === 'delivered') return 'badge-active';
  return 'badge-neutral';
}
