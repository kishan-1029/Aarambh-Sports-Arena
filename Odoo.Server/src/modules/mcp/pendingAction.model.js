import mongoose from 'mongoose';

const pendingActionSchema = new mongoose.Schema(
  {
    actionId: { type: String, required: true, unique: true, index: true },
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArambhApiKey', required: true },
    actingUserId: { type: String, required: true },
    source: { type: String, enum: ['mcp', 'ai'], default: 'mcp' },
    tool: { type: String, required: true },
    args: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: { type: String, required: true },
    riskLevel: { type: String, enum: ['write', 'high'], default: 'write' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    resultRef: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
  },
  { timestamps: true },
);

pendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'expired' } });

export const PendingAction =
  mongoose.models.ArambhPendingAction ||
  mongoose.model('ArambhPendingAction', pendingActionSchema, 'pendingActions');

export default PendingAction;
