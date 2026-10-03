import mongoose from 'mongoose';

/**
 * Unique {courtId, slotStart} is the concurrency guarantee — never two occupants
 * on the same court unit. See docs/08-Booking-Engine.md.
 */
const slotLockSchema = new mongoose.Schema(
  {
    courtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhCourt',
      required: true,
    },
    slotStart: { type: Date, required: true },
    kind: {
      type: String,
      enum: ['booking', 'hold', 'block', 'social'],
      required: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    expiresAt: { type: Date, default: undefined },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

slotLockSchema.index({ courtId: 1, slotStart: 1 }, { unique: true });
slotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
slotLockSchema.index({ refId: 1 });

export const SlotLock =
  mongoose.models.ArambhSlotLock ||
  mongoose.model('ArambhSlotLock', slotLockSchema, 'slotLocks');

export default SlotLock;
