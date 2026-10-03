import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
  {
    amountPaise: { type: Number, required: true },
    at: { type: Date, default: () => new Date() },
    providerRef: { type: String, default: '' },
    reason: { type: String, default: '' },
    by: { type: String, default: '' },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    paymentNo: { type: String, required: true },
    direction: { type: String, enum: ['in', 'out'], default: 'in' },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'online', 'wallet', 'bank_transfer'],
      required: true,
    },
    amountPaise: { type: Number, required: true },
    provider: {
      type: String,
      enum: ['razorpay', 'mock', 'manual'],
      default: 'manual',
    },
    // Omit when unset — sparse unique index must not store null duplicates
    providerRef: { type: String, required: false },
    intentId: { type: String, required: false },
    status: {
      type: String,
      enum: ['pending', 'captured', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    invoiceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArambhInvoice',
      },
    ],
    sourceType: { type: String, default: 'invoice' },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    posSessionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    receivedBy: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
    localDate: { type: String, required: true },
    refunds: { type: [refundSchema], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

paymentSchema.index({ paymentNo: 1 }, { unique: true });
paymentSchema.index({ localDate: 1, method: 1 });
paymentSchema.index({ providerRef: 1 }, { unique: true, sparse: true });
paymentSchema.index({ intentId: 1 }, { sparse: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ invoiceIds: 1 });

export const Payment =
  mongoose.models.ArambhPayment ||
  mongoose.model('ArambhPayment', paymentSchema, 'payments');

export default Payment;
