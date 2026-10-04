import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    station: { type: String, enum: ['bar', 'kitchen', 'counter'], default: 'counter' },
    sequence: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const PosCategory =
  mongoose.models.PosCategory || mongoose.model('PosCategory', schema, 'posCategories');
