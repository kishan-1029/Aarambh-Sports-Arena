import mongoose from 'mongoose';

export const ORDER_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
]);

export const PAYMENT_STATUSES = Object.freeze([
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);

export const PAYMENT_METHODS = Object.freeze([
  'online',
  'upi',
  'card',
  'pay_at_club',
  'cash_on_delivery',
]);

/**
 * Line snapshots. Name, SKU and price are frozen at purchase time so a later
 * catalogue edit never rewrites history.
 */
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhProduct',
      required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    productNameSnapshot: { type: String, required: true },
    variantNameSnapshot: { type: String, default: '' },
    skuSnapshot: { type: String, default: '' },
    imageSnapshot: { type: String, default: '' },
    slugSnapshot: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaise: { type: Number, required: true, min: 0 },
    mrpPaise: { type: Number, default: 0, min: 0 },
    memberDiscountPct: { type: Number, default: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    taxRatePct: { type: Number, default: 0 },
    taxPaise: { type: Number, default: 0, min: 0 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    landmark: { type: String, default: '' },
  },
  { _id: false },
);

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    byName: { type: String, default: '' },
    byId: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, trim: true },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhPortalAccount',
      default: null,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhCustomer',
      default: null,
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },

    /** Membership snapshot — explains the discount on this order forever */
    membershipTierKey: { type: String, default: 'none' },
    membershipPlanKey: { type: String, default: '' },
    memberDiscountPct: { type: Number, default: 0 },

    fulfillmentType: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true,
    },
    deliveryAddress: { type: addressSchema, default: null },
    pickupLocation: { type: String, default: '' },

    items: { type: [orderItemSchema], default: [] },
    subtotalPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    taxPaise: { type: Number, default: 0, min: 0 },
    deliveryChargePaise: { type: Number, default: 0, min: 0 },
    grandTotalPaise: { type: Number, required: true, min: 0 },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    paymentReference: { type: String, default: '' },
    paidAmountPaise: { type: Number, default: 0, min: 0 },
    paymentDate: { type: Date, default: null },

    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    statusHistory: { type: [timelineSchema], default: [] },

    /** Guards against restoring stock twice on repeated cancellations */
    stockDeducted: { type: Boolean, default: false },
    stockRestored: { type: Boolean, default: false },

    customerNote: { type: String, default: '' },
    adminNote: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    source: { type: String, default: 'website' },

    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ accountId: 1, createdAt: -1 });
orderSchema.index({ memberId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ fulfillmentType: 1 });
orderSchema.index({ createdAt: -1 });

export const Order =
  mongoose.models.ArambhOrder || mongoose.model('ArambhOrder', orderSchema, 'shop_orders');

export default Order;
