import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: '' },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PosCategory',
      required: true,
      index: true,
    },
    /** Integer paise */
    pricePaise: { type: Number, required: true, min: 0 },
    /** Relative path e.g. uploads/pos/coke.svg or absolute URL */
    imageUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    station: { type: String, enum: ['bar', 'kitchen', 'counter'], default: 'counter' },
    ageRestricted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ categoryId: 1, isActive: 1 });
schema.index({ sku: 1 }, { unique: true, sparse: true });

export const PosProduct =
  mongoose.models.PosProduct || mongoose.model('PosProduct', schema, 'posProducts');
