import mongoose from 'mongoose';

const openingHourSchema = new mongoose.Schema(
  {
    dow: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, required: true }, // HH:mm
    close: { type: String, required: true },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    address: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    phone: { type: String, default: '' },
    gstin: { type: String, default: '' },
    openingHours: { type: [openingHourSchema], default: [] },
    archivedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

locationSchema.index({ code: 1 }, { unique: true });
locationSchema.index({ archivedAt: 1 });

export const Location =
  mongoose.models.ArambhLocation ||
  mongoose.model('ArambhLocation', locationSchema, 'locations');

export default Location;
