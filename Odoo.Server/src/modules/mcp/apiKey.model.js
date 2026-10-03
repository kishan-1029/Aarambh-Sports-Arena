import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    prefix: { type: String, required: true, unique: true, index: true },
    secretHash: { type: String, required: true },
    scopes: {
      type: [String],
      default: ['mcp.read'],
      validate: {
        validator(v) {
          return (v || []).every((s) =>
            ['mcp.read', 'mcp.write', 'mcp.admin'].includes(s),
          );
        },
      },
    },
    actingUserId: { type: String, required: true },
    actingUserEmail: { type: String, default: '' },
    actingUserName: { type: String, default: '' },
    actingRole: { type: String, default: 'ADMIN' },
    stringPermissions: { type: [String], default: [] },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

apiKeySchema.index({ revokedAt: 1, expiresAt: 1 });

export const ApiKey =
  mongoose.models.ArambhApiKey ||
  mongoose.model('ArambhApiKey', apiKeySchema, 'apiKeys');

export default ApiKey;
