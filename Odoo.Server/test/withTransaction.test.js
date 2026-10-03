import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import { withTransaction } from '../src/lib/db.js';

const probeSchema = new mongoose.Schema({ name: String }, { timestamps: true });
const Probe = mongoose.models.TxnProbe || mongoose.model('TxnProbe', probeSchema, 'txnProbes');

describe('withTransaction', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  test('commits multi-document writes', async () => {
    await withTransaction(async (session) => {
      await Probe.create([{ name: 'a' }, { name: 'b' }], { session, ordered: true });
    });
    expect(await Probe.countDocuments()).toBe(2);
  });

  test('rolls back on error', async () => {
    await expect(
      withTransaction(async (session) => {
        await Probe.create([{ name: 'x' }], { session, ordered: true });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await Probe.countDocuments()).toBe(0);
  });
});
