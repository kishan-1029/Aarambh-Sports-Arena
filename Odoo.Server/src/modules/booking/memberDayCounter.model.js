import mongoose from 'mongoose';

const memberDayCounterSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      required: true,
    },
    localDate: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

memberDayCounterSchema.index({ memberId: 1, localDate: 1 }, { unique: true });

export const MemberDayCounter =
  mongoose.models.ArambhMemberDayCounter ||
  mongoose.model('ArambhMemberDayCounter', memberDayCounterSchema, 'memberDayCounters');

export default MemberDayCounter;
