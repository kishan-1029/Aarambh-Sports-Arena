import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import { idempotency } from '../src/middleware/idempotency.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestId } from '../src/middleware/requestId.js';

function buildApp() {
  let executions = 0;
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.post(
    '/pay',
    idempotency({ scope: 'test:pay' }),
    async (req, res) => {
      executions += 1;
      // simulate slow handler so parallel requests race
      await new Promise((r) => setTimeout(r, 80));
      res.status(201).json({ isOk: true, status: 201, data: { n: executions, amount: req.body.amount } });
    },
  );
  app.use(errorHandler);
  return {
    app,
    getExecutions: () => executions,
  };
}

describe('idempotency middleware', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  test('parallel same key → one execution', async () => {
    const { app, getExecutions } = buildApp();
    const key = 'same-key-parallel-1';
    const body = { amount: 100 };

    const [r1, r2, r3] = await Promise.all([
      request(app).post('/pay').set('Idempotency-Key', key).send(body),
      request(app).post('/pay').set('Idempotency-Key', key).send(body),
      request(app).post('/pay').set('Idempotency-Key', key).send(body),
    ]);

    expect(getExecutions()).toBe(1);
    for (const r of [r1, r2, r3]) {
      expect(r.status).toBe(201);
      expect(r.body.isOk).toBe(true);
      expect(r.body.data.n).toBe(1);
    }
  });

  test('same key different body → IDEMPOTENCY_CONFLICT', async () => {
    const { app } = buildApp();
    const key = 'conflict-key';
    const first = await request(app).post('/pay').set('Idempotency-Key', key).send({ amount: 1 });
    expect(first.status).toBe(201);

    const second = await request(app).post('/pay').set('Idempotency-Key', key).send({ amount: 2 });
    expect(second.status).toBe(409);
    expect(second.body.isOk).toBe(false);
  });
});
