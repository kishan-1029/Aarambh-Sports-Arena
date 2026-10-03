import { z } from 'zod';

const invoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  revenueStream: z
    .enum(['court', 'membership', 'shop', 'bar', 'social', 'coaching', 'delivery', 'other'])
    .optional(),
  qty: z.number().int().min(0),
  unitPricePaise: z.number().int().min(0),
  discountPct: z.number().min(0).max(100).optional(),
  taxId: z.string().optional().nullable(),
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1),
  lines: z.array(invoiceLineSchema).min(1),
  kind: z.enum(['customer_invoice', 'vendor_bill']).optional(),
  sourceType: z
    .enum([
      'membership',
      'booking',
      'order',
      'pos_order',
      'quote',
      'manual',
      'purchase_order',
      'payroll',
    ])
    .optional(),
  sourceId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  post: z.boolean().optional(),
});

export const creditNoteSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const recordPaymentSchema = z.object({
  amountPaise: z.number().int().positive(),
  method: z.enum(['cash', 'card', 'upi', 'online', 'wallet', 'bank_transfer']),
  provider: z.enum(['mock', 'razorpay', 'manual']).optional(),
  providerRef: z.string().optional(),
  capture: z.boolean().optional(),
});

export const refundSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

export const intentParamsSchema = z.object({
  intentId: z.string().min(1),
});

export default {
  invoiceCreateSchema,
  creditNoteSchema,
  recordPaymentSchema,
  refundSchema,
  idParamsSchema,
  intentParamsSchema,
};
