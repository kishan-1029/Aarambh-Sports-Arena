import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { describe, expect, test } from '@jest/globals';
import { getCorsConfig } from '../middlewares/securityHeaders.js';

/**
 * Front Desk "Confirm booking" POSTs JSON plus Idempotency-Key.
 * If preflight does not allow that header, the browser reports Network Error
 * and the booking request never runs.
 */
describe('confirm booking CORS preflight', () => {
  test('allows Idempotency-Key from the admin origin', async () => {
    const app = express();
    const corsConfig = getCorsConfig();
    app.use(cors(corsConfig));
    app.options('*', cors(corsConfig));
    app.post('/api/admin/bookings', (_req, res) => {
      res.status(201).json({ isOk: true });
    });

    const res = await request(app)
      .options('/api/admin/bookings')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,idempotency-key');

    expect(res.status).toBeLessThan(400);
    const allow = String(res.headers['access-control-allow-headers'] || '').toLowerCase();
    expect(allow).toContain('idempotency-key');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
