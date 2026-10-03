import mongoose from 'mongoose';

const hourSchema = new mongoose.Schema(
  {
    dow: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  { _id: false },
);

const peakWindowSchema = new mongoose.Schema(
  {
    dow: { type: [Number], default: [] },
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false },
);

const courtSchema = new mongoose.Schema(
  {
    sportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhSport',
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhLocation',
      default: null,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    surface: { type: String, default: '' },
    indoor: { type: Boolean, default: true },
    floodlit: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'archived'],
      default: 'active',
    },
    operatingHours: { type: [hourSchema], default: [] },
    pricing: {
      walkInPaise: {
        peak: { type: Number, default: 100000 },
        offPeak: { type: Number, default: 70000 },
      },
      memberBasePaise: {
        peak: { type: Number, default: 80000 },
        offPeak: { type: Number, default: 50000 },
      },
      peakWindows: { type: [peakWindowSchema], default: [] },
    },
    taxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhTax',
      default: null,
    },
    allowSocialPlay: { type: Boolean, default: true },
    capacity: { type: Number, default: 4 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

courtSchema.index({ code: 1 }, { unique: true });
courtSchema.index({ sportId: 1, status: 1 });

export const Court =
  mongoose.models.ArambhCourt || mongoose.model('ArambhCourt', courtSchema, 'courts');

export default Court;
