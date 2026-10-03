import mongoose from 'mongoose';

const jobLockSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    lockedUntil: { type: Date, required: true },
    lockedBy: { type: String },
    lastStartedAt: { type: Date },
    lastFinishedAt: { type: Date },
    lastResult: { type: mongoose.Schema.Types.Mixed },
  },
  { versionKey: false },
);

export const JobLock =
  mongoose.models.JobLock || mongoose.model('JobLock', jobLockSchema, 'jobLocks');

/**
 * Acquire a short lock for a cron job. Returns false if already held.
 * @param {string} jobName
 * @param {number} ttlMs
 * @param {string} [workerId]
 */
export async function acquireJobLock(jobName, ttlMs, workerId = 'worker') {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);

  // Ensure row exists
  try {
    await JobLock.create({
      _id: jobName,
      lockedUntil: new Date(0),
      lockedBy: null,
    });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }

  const doc = await JobLock.findOneAndUpdate(
    { _id: jobName, lockedUntil: { $lte: now } },
    {
      $set: {
        lockedUntil,
        lockedBy: workerId,
        lastStartedAt: now,
      },
    },
    { new: true },
  );

  return Boolean(doc);
}

/**
 * @param {string} jobName
 * @param {unknown} [result]
 */
export async function releaseJobLock(jobName, result) {
  await JobLock.updateOne(
    { _id: jobName },
    {
      $set: {
        lockedUntil: new Date(0),
        lastFinishedAt: new Date(),
        lastResult: result,
      },
    },
  );
}

export default JobLock;
