import mongoose from 'mongoose';

const socialParticipantSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhSocialSession',
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      default: null,
    },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'pay_at_desk', 'not_required'],
      default: 'pay_at_desk',
    },
    joinedAt: { type: Date, default: Date.now },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

socialParticipantSchema.index({ sessionId: 1, memberId: 1 }, { unique: true, sparse: true });
socialParticipantSchema.index({ sessionId: 1 });

export const SocialParticipant =
  mongoose.models.ArambhSocialParticipant ||
  mongoose.model('ArambhSocialParticipant', socialParticipantSchema, 'socialParticipants');

export default SocialParticipant;
