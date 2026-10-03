import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { _id: false },
);

const memberSchema = new mongoose.Schema(
  {
    memberCode: { type: String, required: true, unique: true, trim: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhCustomer',
      required: true,
      unique: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    dob: { type: Date, required: true },
    gender: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    photoUrl: { type: String, default: '' },
    emergencyContact: { type: contactSchema, default: () => ({}) },
    guardian: { type: contactSchema, default: () => ({}) },
    currentMembershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMembership',
      default: null,
    },
    tierKey: {
      type: String,
      enum: ['gold', 'silver', 'junior', 'none'],
      default: 'none',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'prospect'],
      default: 'prospect',
    },
    membershipEndDate: { type: Date, default: null },
    walletBalancePaise: { type: Number, default: 0, min: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['front_desk', 'website', 'mobile', 'lead_conversion'],
      default: 'front_desk',
    },
    lastVisitAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

memberSchema.index({ phone: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ firstName: 'text', lastName: 'text', phone: 'text', email: 'text', memberCode: 'text' });
memberSchema.index({ status: 1, membershipEndDate: 1 });
memberSchema.index({ tierKey: 1 });
memberSchema.index({ archivedAt: 1 });

export const Member =
  mongoose.models.ArambhMember ||
  mongoose.model('ArambhMember', memberSchema, 'members');

export default Member;
