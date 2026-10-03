import mongoose from 'mongoose';

const sportSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '' },
    sessionMinutes: { type: Number, default: 60 },
    slotStepMinutes: { type: Number, default: 30 },
    active: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

sportSchema.index({ key: 1 }, { unique: true });
sportSchema.index({ active: 1 });

export const Sport =
  mongoose.models.ArambhSport || mongoose.model('ArambhSport', sportSchema, 'sports');

export default Sport;
