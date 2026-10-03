import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'push'],
      required: true,
    },
    template: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    title: { type: String },
    body: { type: String },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'read'],
      default: 'queued',
    },
    attempts: { type: Number, default: 0 },
    sendAfter: { type: Date, default: Date.now },
    sentAt: { type: Date },
    readAt: { type: Date },
    error: { type: String },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, sendAfter: 1 });

const templateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'push'],
      required: true,
    },
    subject: { type: String },
    body: { type: String, required: true },
    active: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Notification =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema, 'notifications');

export const NotificationTemplate =
  mongoose.models.NotificationTemplate ||
  mongoose.model('NotificationTemplate', templateSchema, 'notificationTemplates');

export default Notification;
