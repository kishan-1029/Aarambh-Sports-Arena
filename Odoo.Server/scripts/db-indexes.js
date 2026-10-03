/**
 * Stub: sync indexes for Arambh models. Expand as models land.
 */
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { AuditLog } from '../src/modules/audit/auditLog.model.js';
import { Notification, NotificationTemplate } from '../src/modules/notifications/notification.model.js';
import { Counter } from '../src/lib/counters.js';
import { IdempotencyKey } from '../src/middleware/idempotency.js';
import { JobLock } from '../src/modules/jobs/jobLock.model.js';

const models = [AuditLog, Notification, NotificationTemplate, Counter, IdempotencyKey, JobLock];

async function main() {
  await connectDb();
  for (const Model of models) {
    await Model.syncIndexes();
    logger.info({ model: Model.modelName }, 'indexes synced');
  }
  await disconnectDb();
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
