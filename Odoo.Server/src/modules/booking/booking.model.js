import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema(
  {
    basePaise: { type: Number, default: 0 },
    discountPaise: { type: Number, default: 0 },
    taxPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, default: 0 },
    rule: { type: String, default: 'walk_in' },
  },
  { _id: false },
);

const customerSnapSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArambhCustomer', default: null },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  { _id: false },
);

const participantSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArambhMember', default: null },
    name: { type: String, default: '' },
    isGuest: { type: Boolean, default: false },
  },
  { _id: false },
);

const cancellationSchema = new mongoose.Schema(
  {
    at: { type: Date },
    by: { type: String, default: '' },
    reason: { type: String, default: '' },
    refundPaise: { type: Number, default: 0 },
    refundMethod: { type: String, enum: ['original', 'wallet', 'none'], default: 'none' },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, required: true },
    courtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhCourt',
      required: true,
    },
    sportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhSport',
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhLocation',
      default: null,
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    localDate: { type: String, required: true },
    slotStarts: { type: [Date], default: [] },
    type: {
      type: String,
      enum: ['member', 'walk_in', 'trial', 'admin', 'coaching'],
      default: 'member',
    },
    bookedByMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      default: null,
    },
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMembership',
      default: null,
    },
    customer: { type: customerSnapSchema, default: null },
    participants: { type: [participantSchema], default: [] },
    channel: {
      type: String,
      enum: ['mobile', 'website', 'front_desk', 'phone', 'ai', 'mcp', 'admin'],
      default: 'front_desk',
    },
    status: {
      type: String,
      enum: ['held', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'expired'],
      default: 'confirmed',
    },
    price: { type: priceSchema, default: () => ({}) },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'pay_at_desk', 'refunded', 'partially_refunded', 'not_required'],
      default: 'unpaid',
    },
    paymentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ArambhPayment' }],
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhInvoice',
      default: null,
    },
    holdExpiresAt: { type: Date, default: null },
    cancellation: { type: cancellationSchema, default: null },
    notes: { type: String, default: '' },
    priceOverrideReason: { type: String, default: '' },
    // Omit when unset — a sparse unique index still indexes explicit nulls
    idempotencyKey: { type: String },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

bookingSchema.index({ bookingNo: 1 }, { unique: true });
bookingSchema.index({ courtId: 1, start: 1 });
bookingSchema.index({ bookedByMemberId: 1, start: -1 });
bookingSchema.index({ localDate: 1, status: 1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Booking =
  mongoose.models.ArambhBooking ||
  mongoose.model('ArambhBooking', bookingSchema, 'bookings');

export default Booking;
