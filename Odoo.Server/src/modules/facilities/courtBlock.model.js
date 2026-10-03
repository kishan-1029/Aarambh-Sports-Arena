import mongoose from 'mongoose';

const courtBlockSchema = new mongoose.Schema(
  {
    courtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhCourt',
      required: true,
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: {
      type: String,
      enum: ['maintenance', 'event', 'coaching', 'social_play', 'tournament'],
      required: true,
    },
    note: { type: String, default: '' },
    socialSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhSocialSession',
      default: null,
    },
    createdBy: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

courtBlockSchema.index({ courtId: 1, start: 1, end: 1 });

export const CourtBlock =
  mongoose.models.ArambhCourtBlock ||
  mongoose.model('ArambhCourtBlock', courtBlockSchema, 'courtBlocks');

export default CourtBlock;
