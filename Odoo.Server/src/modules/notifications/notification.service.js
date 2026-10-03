import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { Notification, NotificationTemplate } from './notification.model.js';
import { renderTemplate } from './notificationTemplates.js';
import { emitAfterCommit } from '../../events/bus.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) {
    transporter = {
      sendMail: async (opts) => {
        logger.info({ to: opts.to, subject: opts.subject }, 'SMTP stub: email not sent (no SMTP_HOST)');
        return { messageId: 'stub' };
      },
    };
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    auth: config.smtp.user
      ? { user: config.smtp.user, pass: config.smtp.password }
      : undefined,
  });
  return transporter;
}

/**
 * Queue a notification (in-app / email / sms / push).
 * @param {{
 *   userId?: string,
 *   channel: 'in_app'|'email'|'sms'|'push',
 *   template?: string,
 *   data?: Record<string, unknown>,
 *   title?: string,
 *   body?: string,
 *   to?: string,
 *   sendAfter?: Date,
 * }} input
 */
export async function enqueue(input) {
  let title = input.title;
  let body = input.body;

  if (input.template) {
    const tmpl = await NotificationTemplate.findOne({ key: input.template, active: true }).lean();
    if (tmpl) {
      title = title || renderTemplate(tmpl.subject || tmpl.key, input.data);
      body = body || renderTemplate(tmpl.body, input.data);
    }
  }

  const doc = await Notification.create({
    userId: input.userId || null,
    channel: input.channel,
    template: input.template,
    data: { ...(input.data || {}), to: input.to },
    title,
    body,
    status: 'queued',
    sendAfter: input.sendAfter || new Date(),
  });

  emitAfterCommit('notification.queued', { id: doc._id.toString(), channel: doc.channel });
  return doc;
}

async function sendOne(doc) {
  const channel = doc.channel;
  if (channel === 'in_app') {
    // Persisted row is the delivery; mark sent.
    return;
  }
  if (channel === 'email') {
    const to = doc.data?.to;
    if (!to) throw new Error('email notification missing data.to');
    await getTransporter().sendMail({
      from: config.smtp.from,
      to,
      subject: doc.title || config.appName,
      text: doc.body || '',
    });
    return;
  }
  if (channel === 'sms' || channel === 'push') {
    logger.info({ channel, id: doc._id }, `${channel} stub: not sent`);
    return;
  }
  throw new Error(`Unknown channel ${channel}`);
}

/**
 * Dispatch queued notifications (worker job).
 * @param {{ limit?: number }} [opts]
 */
export async function dispatchQueued(opts = {}) {
  const limit = opts.limit ?? 50;
  const now = new Date();
  const pending = await Notification.find({
    status: 'queued',
    sendAfter: { $lte: now },
  })
    .sort({ sendAfter: 1 })
    .limit(limit);

  let sent = 0;
  for (const doc of pending) {
    try {
      doc.attempts += 1;
      await sendOne(doc);
      doc.status = 'sent';
      doc.sentAt = new Date();
      doc.error = undefined;
      await doc.save();
      sent += 1;
      if (doc.userId) {
        emitAfterCommit('notification.sent', {
          userId: doc.userId.toString(),
          id: doc._id.toString(),
        });
      }
    } catch (err) {
      doc.status = doc.attempts >= 5 ? 'failed' : 'queued';
      doc.error = err?.message || String(err);
      doc.sendAfter = new Date(Date.now() + Math.min(60_000 * 2 ** doc.attempts, 3600_000));
      await doc.save();
      logger.warn({ err, id: doc._id }, 'notification dispatch failed');
    }
  }
  return { processed: pending.length, sent };
}

export const notificationService = { enqueue, dispatchQueued };

export default notificationService;
