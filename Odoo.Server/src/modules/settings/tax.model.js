import mongoose from 'mongoose';

const taxComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ratePct: { type: Number, required: true },
  },
  { _id: false },
);

const taxSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ratePct: { type: Number, required: true },
    components: { type: [taxComponentSchema], default: [] },
    appliesTo: {
      type: [String],
      default: ['court', 'membership', 'shop', 'bar'],
    },
    active: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

taxSchema.index({ name: 1 });
taxSchema.index({ active: 1 });

export const Tax =
  mongoose.models.ArambhTax || mongoose.model('ArambhTax', taxSchema, 'taxes');

export default Tax;
