import mongoose from 'mongoose';

const durationSchema = new mongoose.Schema(
  {
    months: { type: Number, required: true, min: 1 },
    pricePaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const courtPricingSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['free', 'discount_pct', 'fixed_paise'],
      default: 'discount_pct',
    },
    value: { type: Number, default: 0 },
  },
  { _id: false },
);

const courtEntitlementsSchema = new mongoose.Schema(
  {
    access: {
      type: String,
      enum: ['all', 'off_peak_only', 'none'],
      default: 'all',
    },
    pricing: { type: courtPricingSchema, default: () => ({}) },
    maxBookingsPerDay: { type: Number, default: 2 },
    advanceBookingDays: { type: Number, default: 14 },
    sportKeys: { type: [String], default: [] },
  },
  { _id: false },
);

const entitlementsSchema = new mongoose.Schema(
  {
    court: { type: courtEntitlementsSchema, default: () => ({}) },
    shopDiscountPct: { type: Number, default: 0 },
    barDiscountPct: { type: Number, default: 0 },
    guestPasses: { type: Number, default: 0 },
    perks: { type: [String], default: [] },
  },
  { _id: false },
);

const planSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    colour: { type: String, default: '#0d6efd' },
    version: { type: Number, default: 1 },
    durations: { type: [durationSchema], default: [] },
    eligibility: {
      minAge: { type: Number, default: null },
      maxAge: { type: Number, default: null },
    },
    entitlements: { type: entitlementsSchema, default: () => ({}) },
    taxId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArambhTax', default: null },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

planSchema.index(
  { key: 1, version: 1 },
  { unique: true },
);
planSchema.index({ active: 1, archivedAt: 1, sortOrder: 1 });

export const MembershipPlan =
  mongoose.models.ArambhMembershipPlan ||
  mongoose.model('ArambhMembershipPlan', planSchema, 'membershipPlans');

export default MembershipPlan;
