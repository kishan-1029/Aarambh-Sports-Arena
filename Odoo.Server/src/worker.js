import cron from 'node-cron';
import { connectDb } from './lib/db.js';
import { logger } from './lib/logger.js';
import { config } from './config/index.js';
import { acquireJobLock, releaseJobLock } from './modules/jobs/jobLock.model.js';
import { notificationService } from './modules/notifications/notification.service.js';

const workerId = `worker-${process.pid}`;

async function runJob(name, ttlMs, fn) {
  const got = await acquireJobLock(name, ttlMs, workerId);
  if (!got) {
    logger.debug({ job: name }, 'job lock held; skip');
    return;
  }
  const started = Date.now();
  logger.info({ job: name }, 'job start');
  try {
    const result = await fn();
    logger.info({ job: name, ms: Date.now() - started, result }, 'job end');
    await releaseJobLock(name, result);
  } catch (err) {
    logger.error({ err, job: name }, 'job failed');
    await releaseJobLock(name, { error: err?.message });
  }
}

/** Placeholder jobs — real work lands in later phases. */
const jobs = [
  {
    name: 'holds.expire',
    schedule: '* * * * *',
    ttlMs: 50_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
  {
    name: 'orders.releaseUnpaid',
    schedule: '*/5 * * * *',
    ttlMs: 240_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
  {
    name: 'bookings.complete',
    schedule: '*/15 * * * *',
    ttlMs: 600_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
  {
    name: 'leads.sla',
    schedule: '*/15 * * * *',
    ttlMs: 600_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
  {
    name: 'notifications.dispatch',
    schedule: '*/30 * * * * *',
    ttlMs: 25_000,
    run: async () => notificationService.dispatchQueued({ limit: 50 }),
  },
  {
    name: 'membership.reminders',
    schedule: '0 9 * * *',
    ttlMs: 3_600_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
  {
    name: 'membership.expire',
    schedule: '5 0 * * *',
    ttlMs: 3_600_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
  {
    name: 'stock.lowDigest',
    schedule: '0 8 * * *',
    ttlMs: 3_600_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
  {
    name: 'reports.dailySnapshot',
    schedule: '55 23 * * *',
    ttlMs: 3_600_000,
    run: async () => ({ tick: true, note: 'placeholder' }),
  },
];

async function main() {
  await connectDb();
  logger.info({ app: config.appName, workerId }, 'worker starting');

  for (const job of jobs) {
    if (!cron.validate(job.schedule)) {
      logger.warn({ job: job.name, schedule: job.schedule }, 'invalid cron; skip');
      continue;
    }
    cron.schedule(
      job.schedule,
      () => {
        runJob(job.name, job.ttlMs, job.run);
      },
      { timezone: config.clubTimezone },
    );
    logger.info({ job: job.name, schedule: job.schedule }, 'job scheduled');
  }

  // Immediate tick so `worker:dev` shows activity
  await runJob('notifications.dispatch', 25_000, () =>
    notificationService.dispatchQueued({ limit: 10 }),
  );
}

main().catch((err) => {
  logger.error({ err }, 'worker failed to start');
  process.exit(1);
});
