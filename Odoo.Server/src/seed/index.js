/**
 * Demo seed runner.
 * --reset deletes ONLY documents with isDemo: true. Never dropDatabase / unfiltered deleteMany.
 */
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';
import {
  Notification,
  NotificationTemplate,
} from '../modules/notifications/notification.model.js';
import { DEFAULT_TEMPLATES } from '../modules/notifications/notificationTemplates.js';
import { audit } from '../modules/audit/audit.service.js';

const clubSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    clubName: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    priceIncludesTax: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ClubSettings =
  mongoose.models.ClubSettings ||
  mongoose.model('ClubSettings', clubSettingsSchema, 'clubSettings');

async function resetDemo() {
  const collections = [
    ClubSettings,
    Notification,
    NotificationTemplate,
  ];

  for (const Model of collections) {
    const res = await Model.deleteMany({ isDemo: true });
    logger.info({ model: Model.modelName, deleted: res.deletedCount }, 'demo reset');
  }
}

async function seedClub() {
  await ClubSettings.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      clubName: 'Arambh Sports Arena',
      timezone: config.clubTimezone,
      currency: 'INR',
      priceIncludesTax: false,
      isDemo: true,
    },
    { upsert: true, new: true },
  );
  logger.info('seeded club settings (Arambh Sports Arena)');
}

async function seedTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    await NotificationTemplate.findOneAndUpdate(
      { key: t.key },
      { ...t, isDemo: true },
      { upsert: true, new: true },
    );
  }
  logger.info({ count: DEFAULT_TEMPLATES.length }, 'seeded notification templates');
}

async function main() {
  const reset = process.argv.includes('--reset');
  await connectDb();

  if (reset) {
    await resetDemo();
  }

  await seedClub();
  await seedTemplates();

  await audit.record({
    actor: { type: 'system', name: 'seed' },
    source: 'system',
    action: 'seed.demo',
    entity: { type: 'clubSettings', id: 'default', label: 'Arambh Sports Arena' },
    after: { clubName: 'Arambh Sports Arena' },
  });

  logger.info('seed complete');
  await disconnectDb();
}

main().catch(async (err) => {
  logger.error({ err }, 'seed failed');
  try {
    await disconnectDb();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
