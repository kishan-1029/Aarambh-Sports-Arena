import mongoose from 'mongoose';

const actorSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['user', 'apiKey', 'system', 'ai'], required: true },
    id: { type: String },
    name: { type: String },
  },
  { _id: false },
);

const entitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    id: { type: String },
    label: { type: String },
  },
  { _id: false },
);

const auditLogSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now, required: true },
    actor: { type: actorSchema, required: true },
    source: {
      type: String,
      enum: ['admin', 'pos', 'front_desk', 'website', 'mobile', 'ai', 'mcp', 'worker', 'system'],
      required: true,
    },
    action: { type: String, required: true },
    entity: { type: entitySchema },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    requestId: { type: String },
  },
  { timestamps: false, versionKey: false },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ 'entity.type': 1, 'entity.id': 1, at: -1 });
auditLogSchema.index({ 'actor.id': 1, at: -1 });
auditLogSchema.index({ source: 1, at: -1 });

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema, 'auditLogs');

export default AuditLog;
