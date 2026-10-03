import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'default' },
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    phone: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const customerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['person', 'company'], default: 'person' },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    gstin: { type: String, default: '' },
    billingAddress: { type: addressSchema, default: () => ({}) },
    addresses: { type: [addressSchema], default: [] },
    tags: { type: [String], default: [] },
    notes: { type: String, default: '' },
    paymentTermsDays: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ name: 'text', email: 'text', phone: 'text' });
customerSchema.index({ archivedAt: 1 });

export const Customer =
  mongoose.models.ArambhCustomer ||
  mongoose.model('ArambhCustomer', customerSchema, 'customers');

export default Customer;
