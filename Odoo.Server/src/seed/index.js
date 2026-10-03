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
import { ArambhRole } from '../modules/auth/role.model.js';
import { seedArambhRoles } from '../modules/auth/seedRoles.js';
import { Location } from '../modules/settings/location.model.js';
import { Settings } from '../modules/settings/settings.model.js';
import { Tax } from '../modules/settings/tax.model.js';
import { Customer } from '../modules/customers/customer.model.js';
import { Invoice } from '../modules/finance/invoice.model.js';
import { Payment } from '../modules/finance/payment.model.js';
import { createAndPost } from '../modules/finance/invoice.service.js';

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
    ArambhRole,
    Location,
    Settings,
    Tax,
    Customer,
    Invoice,
    Payment,
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

  const location = await Location.findOneAndUpdate(
    { code: 'MAIN', isDemo: true },
    {
      name: 'Arambh Sports Arena — Main',
      code: 'MAIN',
      address: 'Vadodara, Gujarat',
      timezone: 'Asia/Kolkata',
      phone: '+91-9999999999',
      gstin: '24AAAAA0000A1Z5',
      openingHours: [
        { dow: 1, open: '06:00', close: '23:00' },
        { dow: 2, open: '06:00', close: '23:00' },
        { dow: 3, open: '06:00', close: '23:00' },
        { dow: 4, open: '06:00', close: '23:00' },
        { dow: 5, open: '06:00', close: '23:00' },
        { dow: 6, open: '06:00', close: '22:00' },
        { dow: 0, open: '07:00', close: '21:00' },
      ],
      isDemo: true,
    },
    { upsert: true, new: true },
  );

  await Settings.findOneAndUpdate(
    { locationId: null },
    {
      locationId: null,
      clubName: 'Arambh Sports Arena',
      currency: 'INR',
      priceIncludesTax: false,
      bookingCancelFreeHours: 4,
      holdMinutes: 10,
      maxAdvanceDays: 14,
      walkInRequiresPhone: true,
      lowStockDefault: 5,
      invoicePrefix: 'INV',
      receiptFooter: 'Thank you for visiting Arambh Sports Arena',
      paymentsProvider: config.paymentsProvider || 'mock',
      isDemo: true,
    },
    { upsert: true, new: true },
  );

  logger.info({ locationId: String(location._id) }, 'seeded club settings + location');
  return location;
}

async function seedTaxes() {
  const specs = [
    {
      name: 'GST 18%',
      ratePct: 18,
      components: [
        { name: 'CGST', ratePct: 9 },
        { name: 'SGST', ratePct: 9 },
      ],
      appliesTo: ['court', 'membership', 'shop', 'bar'],
    },
    {
      name: 'GST 5%',
      ratePct: 5,
      components: [
        { name: 'CGST', ratePct: 2.5 },
        { name: 'SGST', ratePct: 2.5 },
      ],
      appliesTo: ['shop', 'bar'],
    },
  ];

  const taxes = [];
  for (const t of specs) {
    const doc = await Tax.findOneAndUpdate(
      { name: t.name, isDemo: true },
      { ...t, active: true, isDemo: true },
      { upsert: true, new: true },
    );
    taxes.push(doc);
  }
  logger.info({ count: taxes.length }, 'seeded taxes');
  return taxes;
}

async function seedCustomers() {
  const specs = [
    {
      type: 'person',
      name: 'Riya Sharma',
      email: 'riya.demo@example.com',
      phone: '9876500001',
      tags: ['member'],
    },
    {
      type: 'person',
      name: 'Aarav Patel',
      email: 'aarav.demo@example.com',
      phone: '9876500002',
      tags: ['walk-in'],
    },
    {
      type: 'company',
      name: 'Demo Corp Events',
      email: 'billing@democorp.example.com',
      phone: '9876500003',
      gstin: '24BBBBB0000B1Z5',
      tags: ['b2b'],
      paymentTermsDays: 30,
    },
  ];

  const customers = [];
  for (const c of specs) {
    const doc = await Customer.findOneAndUpdate(
      { email: c.email, isDemo: true },
      { ...c, isDemo: true },
      { upsert: true, new: true },
    );
    customers.push(doc);
  }
  logger.info({ count: customers.length }, 'seeded customers');
  return customers;
}

async function seedSampleInvoice(customers, taxes, location) {
  const existing = await Invoice.findOne({ isDemo: true, kind: 'customer_invoice' }).lean();
  if (existing) {
    logger.info({ number: existing.number }, 'demo invoice already present');
    return existing;
  }

  const tax18 = taxes.find((t) => t.ratePct === 18) || taxes[0];
  const invoice = await createAndPost(
    {
      customerId: String(customers[0]._id),
      locationId: String(location._id),
      sourceType: 'manual',
      lines: [
        {
          description: 'Court hire — demo (1 hour)',
          revenueStream: 'court',
          qty: 1,
          unitPricePaise: 100000, // ₹1000
          discountPct: 0,
          taxId: String(tax18._id),
        },
      ],
      notes: 'Seeded demo invoice',
      post: true,
      isDemo: true,
    },
    { source: 'system', user: { name: 'seed' } },
  );
  logger.info({ number: invoice.number }, 'seeded sample posted invoice');
  return invoice;
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
  const location = await Location.findOne({ code: 'MAIN' });
  const taxes = await seedTaxes();
  const customers = await seedCustomers();
  await seedSampleInvoice(customers, taxes, location);
  await seedTemplates();
  await seedArambhRoles();

  await audit.record({
    actor: { type: 'system', name: 'seed' },
    source: 'system',
    action: 'seed.demo',
    entity: { type: 'clubSettings', id: 'default', label: 'Arambh Sports Arena' },
    after: {
      clubName: 'Arambh Sports Arena',
      roles: ['owner', 'manager', 'front_desk', 'bar_staff', 'finance'],
      phase4: ['location', 'taxes', 'customers', 'sampleInvoice'],
    },
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
