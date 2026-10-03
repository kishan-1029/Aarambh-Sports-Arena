import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { Tax } from '../src/modules/settings/tax.model.js';
import { Invoice } from '../src/modules/finance/invoice.model.js';
import { Payment } from '../src/modules/finance/payment.model.js';
import {
  buildComputedLines,
  createAndPost,
  creditNote,
  allocateInvoiceNumber,
  financialYearKey,
} from '../src/modules/finance/invoice.service.js';
import { record, confirmIntent, refund } from '../src/modules/finance/payment.service.js';
import { computeLine } from '../src/lib/money.js';
import { getPaymentProvider } from '../src/modules/finance/providers/index.js';

describe('finance core', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  async function seedFixtures() {
    const tax = await Tax.create({
      name: 'GST 18%',
      ratePct: 18,
      components: [
        { name: 'CGST', ratePct: 9 },
        { name: 'SGST', ratePct: 9 },
      ],
      appliesTo: ['court'],
      active: true,
    });
    const customer = await Customer.create({
      type: 'person',
      name: 'Test Customer',
      email: 'test@arambh.test',
      phone: '9000000000',
    });
    return { tax, customer };
  }

  test('invoice totals equal sum of computeLine', async () => {
    const { tax, customer } = await seedFixtures();
    const { lines, totals } = await buildComputedLines([
      {
        description: 'Court',
        revenueStream: 'court',
        qty: 2,
        unitPricePaise: 10000,
        discountPct: 10,
        taxId: String(tax._id),
      },
    ]);

    const expected = computeLine({
      unitPricePaise: 10000,
      qty: 2,
      discountPct: 10,
      tax: [
        { name: 'CGST', ratePct: 9 },
        { name: 'SGST', ratePct: 9 },
      ],
    });

    expect(lines[0].totalPaise).toBe(expected.totalPaise);
    expect(totals.totalPaise).toBe(expected.totalPaise);
    expect(totals.taxPaise).toBe(expected.taxPaise);
    expect(totals.duePaise).toBe(expected.totalPaise);

    const inv = await createAndPost({
      customerId: String(customer._id),
      lines: [
        {
          description: 'Court',
          revenueStream: 'court',
          qty: 2,
          unitPricePaise: 10000,
          discountPct: 10,
          taxId: String(tax._id),
        },
      ],
      post: true,
    });
    expect(inv.totals.totalPaise).toBe(expected.totalPaise);
    expect(inv.status).toBe('posted');
  });

  test('credit note reverses posted invoice', async () => {
    const { tax, customer } = await seedFixtures();
    const inv = await createAndPost({
      customerId: String(customer._id),
      lines: [
        {
          description: 'Membership',
          revenueStream: 'membership',
          qty: 1,
          unitPricePaise: 50000,
          taxId: String(tax._id),
        },
      ],
    });

    const cn = await creditNote(String(inv._id), { reason: 'test reverse' });
    expect(cn.kind).toBe('credit_note');
    expect(cn.totals.totalPaise).toBe(-inv.totals.totalPaise);
    expect(cn.reversalOfId.toString()).toBe(String(inv._id));

    const refreshed = await Invoice.findById(inv._id).lean();
    expect(refreshed.status).toBe('void');
    expect(refreshed.totals.duePaise).toBe(0);
  });

  test('mock pay partial then full', async () => {
    const { tax, customer } = await seedFixtures();
    const inv = await createAndPost({
      customerId: String(customer._id),
      lines: [
        {
          description: 'Shop',
          revenueStream: 'shop',
          qty: 1,
          unitPricePaise: 10000,
          taxId: String(tax._id),
        },
      ],
    });

    const half = Math.floor(inv.totals.totalPaise / 2);
    const p1 = await record({
      invoiceId: String(inv._id),
      amountPaise: half,
      method: 'cash',
    });
    expect(p1.status).toBe('captured');

    let refreshed = await Invoice.findById(inv._id).lean();
    expect(refreshed.status).toBe('partially_paid');
    expect(refreshed.totals.paidPaise).toBe(half);

    await record({
      invoiceId: String(inv._id),
      amountPaise: refreshed.totals.duePaise,
      method: 'upi',
    });
    refreshed = await Invoice.findById(inv._id).lean();
    expect(refreshed.status).toBe('paid');
    expect(refreshed.totals.duePaise).toBe(0);
  });

  test('mock online intent → succeed confirms payment', async () => {
    const { tax, customer } = await seedFixtures();
    const inv = await createAndPost({
      customerId: String(customer._id),
      lines: [
        {
          description: 'Online',
          revenueStream: 'other',
          qty: 1,
          unitPricePaise: 20000,
          taxId: String(tax._id),
        },
      ],
    });

    const pending = await record({
      invoiceId: String(inv._id),
      amountPaise: inv.totals.totalPaise,
      method: 'online',
      provider: 'mock',
      capture: false,
    });
    expect(pending.status).toBe('pending');
    expect(pending.intent?.intentId).toBeTruthy();

    const captured = await confirmIntent(pending.intent.intentId);
    expect(captured.status).toBe('captured');

    const refreshed = await Invoice.findById(inv._id).lean();
    expect(refreshed.status).toBe('paid');
  });

  test('refund creates credit note path', async () => {
    const { tax, customer } = await seedFixtures();
    const inv = await createAndPost({
      customerId: String(customer._id),
      lines: [
        {
          description: 'Refundable',
          revenueStream: 'court',
          qty: 1,
          unitPricePaise: 10000,
          taxId: String(tax._id),
        },
      ],
    });
    const pay = await record({
      invoiceId: String(inv._id),
      amountPaise: inv.totals.totalPaise,
      method: 'cash',
    });

    const result = await refund(String(pay._id), { reason: 'customer request' });
    expect(result.payment.status).toBe('refunded');
    expect(result.creditNote).toBeTruthy();
    expect(result.creditNote.kind).toBe('credit_note');
  });

  test('invoice numbering unique under concurrency', async () => {
    const n = 20;
    const numbers = await Promise.all(
      Array.from({ length: n }, () => allocateInvoiceNumber('customer_invoice')),
    );
    expect(new Set(numbers).size).toBe(n);
    const fy = financialYearKey();
    for (const num of numbers) {
      expect(num).toMatch(new RegExp(`^INV/${fy}/\\d{5}$`));
    }
  });

  test('mock provider createIntent + parseWebhook', async () => {
    const provider = getPaymentProvider('mock');
    const intent = await provider.createIntent({ amountPaise: 100 });
    expect(intent.intentId).toMatch(/^mock_/);
    const parsed = provider.parseWebhook({
      id: 'evt_1',
      event: 'payment.captured',
      intentId: intent.intentId,
      providerRef: 'ref_1',
    });
    expect(parsed.intentId).toBe(intent.intentId);
    expect(provider.verifySignature('{}', 'x')).toBe(true);
  });

  test('Payment model persists after record', async () => {
    const { tax, customer } = await seedFixtures();
    const inv = await createAndPost({
      customerId: String(customer._id),
      lines: [
        {
          description: 'Persist',
          qty: 1,
          unitPricePaise: 5000,
          taxId: String(tax._id),
        },
      ],
    });
    await record({
      invoiceId: String(inv._id),
      amountPaise: inv.totals.totalPaise,
      method: 'card',
    });
    const count = await Payment.countDocuments({ status: 'captured' });
    expect(count).toBe(1);
  });
});
