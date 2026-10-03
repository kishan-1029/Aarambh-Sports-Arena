import mongoose from 'mongoose';

const socialSessionSchema = new mongoose.Schema(
  {
    courtIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArambhCourt',
      },
    ],
    sportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhSport',
      required: true,
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    title: { type: String, default: 'Friday Social' },
    capacity: { type: Number, required: true },
    pricePerPlayer: {
      memberPaise: { type: Number, default: 20000 },
      guestPaise: { type: Number, default: 35000 },
    },
    joinedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['open', 'full', 'cancelled', 'completed'],
      default: 'open',
    },
    membersOnly: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

socialSessionSchema.index({ start: 1, status: 1 });
socialSessionSchema.index({ sportId: 1, start: 1 });

export const SocialSession =
  mongoose.models.ArambhSocialSession ||
  mongoose.model('ArambhSocialSession', socialSessionSchema, 'socialSessions');

export default SocialSession;
