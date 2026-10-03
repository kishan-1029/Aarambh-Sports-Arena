import mongoose from 'mongoose';

const activityEventSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      required: true,
    },
    at: { type: Date, required: true, default: () => new Date() },
    type: { type: String, required: true },
    title: { type: String, required: true },
    refType: { type: String, default: '' },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    amountPaise: { type: Number, default: null },
    source: { type: String, default: 'system' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: false },
);

activityEventSchema.index({ memberId: 1, at: -1 });

export const ActivityEvent =
  mongoose.models.ArambhActivityEvent ||
  mongoose.model('ArambhActivityEvent', activityEventSchema, 'activityEvents');

export default ActivityEvent;
