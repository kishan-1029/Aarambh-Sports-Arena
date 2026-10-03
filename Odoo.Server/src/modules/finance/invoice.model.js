import mongoose from 'mongoose';

const taxBreakdownSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ratePct: { type: Number, required: true },
    amountPaise: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    revenueStream: {
      type: String,
      enum: ['court', 'membership', 'shop', 'bar', 'social', 'coaching', 'delivery', 'other'],
      default: 'other',
    },
    qty: { type: Number, required: true, min: 0 },
    unitPricePaise: { type: Number, required: true },
    discountPaise: { type: Number, default: 0 },
    discountPct: { type: Number, default: 0 },
    taxId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArambhTax', default: null },
    taxPaise: { type: Number, default: 0 },
    taxBreakdown: { type: [taxBreakdownSchema], default: [] },
    totalPaise: { type: Number, required: true },
  },
  { _id: false },
);

const totalsSchema = new mongoose.Schema(
  {
    subtotalPaise: { type: Number, default: 0 },
    discountPaise: { type: Number, default: 0 },
    taxPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, default: 0 },
    paidPaise: { type: Number, default: 0 },
    duePaise: { type: Number, default: 0 },
  },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    kind: {
      type: String,
      enum: ['customer_invoice', 'vendor_bill', 'credit_note'],
      default: 'customer_invoice',
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhCustomer',
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhLocation',
      default: null,
    },
    sourceType: {
      type: String,
      enum: [
        'membership',
        'booking',
        'order',
        'pos_order',
        'quote',
        'manual',
        'purchase_order',
        'payroll',
      ],
      default: 'manual',
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    lines: { type: [invoiceLineSchema], default: [] },
    totals: { type: totalsSchema, default: () => ({}) },
    issueDate: { type: Date, default: () => new Date() },
    dueDate: { type: Date, default: null },
    localDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'posted', 'partially_paid', 'paid', 'void'],
      default: 'draft',
    },
    reversalOfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhInvoice',
      default: null,
    },
    pdfUrl: { type: String, default: null },
    notes: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

invoiceSchema.index({ number: 1 }, { unique: true });
invoiceSchema.index({ kind: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ customerId: 1, issueDate: -1 });
invoiceSchema.index({ localDate: 1 });
invoiceSchema.index({ 'lines.revenueStream': 1, localDate: 1 });

export const Invoice =
  mongoose.models.ArambhInvoice ||
  mongoose.model('ArambhInvoice', invoiceSchema, 'invoices');

export default Invoice;
