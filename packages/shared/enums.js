export const BOOKING_STATUS = Object.freeze([
  'held',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'expired',
  'no_show',
]);

export const MEMBER_STATUS = Object.freeze(['active', 'expired', 'suspended', 'prospect']);

export const PAYMENT_STATUS = Object.freeze([
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
]);

export const NOTIFICATION_CHANNEL = Object.freeze(['in_app', 'email', 'sms', 'push']);

export const ACTOR_TYPE = Object.freeze(['user', 'apiKey', 'system', 'ai']);

export default {
  BOOKING_STATUS,
  MEMBER_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_CHANNEL,
  ACTOR_TYPE,
};
