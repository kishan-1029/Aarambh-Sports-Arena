import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosProduct' },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPaise: { type: Number, required: true },
    linePaise: { type: Number, required: true },
    station: { type: String, default: 'counter' },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    clientOrderId: { type: String, required: true, unique: true },
    cafeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosCafe', index: true },
    cafeName: { type: String, default: '' },
    cafeCode: { type: String, default: '' },
    lines: { type: [lineSchema], default: [] },
    subtotalPaise: { type: Number, required: true },
    totalPaise: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'paid', 'void'],
      default: 'draft',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'other'],
      default: 'cash',
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway', 'counter'],
      default: 'counter',
    },
    localDate: { type: String, index: true },
    note: { type: String, default: '' },
    guestLabel: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const PosOrder =
  mongoose.models.PosOrder || mongoose.model('PosOrder', schema, 'posOrders');
