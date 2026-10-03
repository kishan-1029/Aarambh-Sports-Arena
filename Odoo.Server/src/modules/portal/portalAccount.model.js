import mongoose from 'mongoose';

const portalAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    passwordHash: { type: String, required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhCustomer',
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

portalAccountSchema.index({ email: 1 });
portalAccountSchema.index({ phone: 1 });

export const PortalAccount =
  mongoose.models.ArambhPortalAccount ||
  mongoose.model('ArambhPortalAccount', portalAccountSchema, 'portal_accounts');

export default PortalAccount;
