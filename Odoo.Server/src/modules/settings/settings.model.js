import mongoose from 'mongoose';

/**
 * Club / location settings. One document per location (locationId null = club-wide defaults).
 */
const settingsSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhLocation',
      default: null,
    },
    clubName: { type: String, default: 'Arambh Sports Arena' },
    currency: { type: String, default: 'INR' },
    priceIncludesTax: { type: Boolean, default: false },
    bookingCancelFreeHours: { type: Number, default: 4 },
    holdMinutes: { type: Number, default: 10 },
    maxAdvanceDays: { type: Number, default: 14 },
    walkInRequiresPhone: { type: Boolean, default: true },
    lowStockDefault: { type: Number, default: 5 },
    invoicePrefix: { type: String, default: 'INV' },
    receiptFooter: { type: String, default: 'Thank you for visiting Arambh Sports Arena' },
    paymentsProvider: { type: String, enum: ['mock', 'razorpay'], default: 'mock' },
    posInvoiceMode: { type: String, enum: ['per_order', 'per_session'], default: 'per_order' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

settingsSchema.index({ locationId: 1 }, { unique: true, sparse: true });

export const Settings =
  mongoose.models.ArambhSettings ||
  mongoose.model('ArambhSettings', settingsSchema, 'settings');

export default Settings;
