import mongoose from 'mongoose';

const reminderSentSchema = new mongoose.Schema(
  {
    d30: { type: Date, default: null },
    d7: { type: Date, default: null },
    d1: { type: Date, default: null },
    d0: { type: Date, default: null },
  },
  { _id: false },
);

const membershipSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMembershipPlan',
      required: true,
    },
    planKey: { type: String, required: true },
    planVersion: { type: Number, required: true },
    entitlementsSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startLocalDate: { type: String, required: true },
    endLocalDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'scheduled', 'active', 'expired', 'cancelled', 'upgraded'],
      default: 'pending_payment',
    },
    pricePaise: { type: Number, required: true },
    durationMonths: { type: Number, required: true },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhInvoice',
      default: null,
    },
    renewalOfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMembership',
      default: null,
    },
    autoRenew: { type: Boolean, default: false },
    reminderSentAt: { type: reminderSentSchema, default: () => ({}) },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

membershipSchema.index({ memberId: 1, startDate: -1 });
membershipSchema.index({ status: 1, endDate: 1 });
membershipSchema.index(
  { memberId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export const Membership =
  mongoose.models.ArambhMembership ||
  mongoose.model('ArambhMembership', membershipSchema, 'memberships');

export default Membership;
