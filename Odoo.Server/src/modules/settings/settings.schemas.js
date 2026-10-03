import { z } from 'zod';

const openingHour = z.object({
  dow: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

export const locationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(32),
  address: z.string().max(500).optional(),
  timezone: z.string().optional(),
  phone: z.string().max(32).optional(),
  gstin: z.string().max(20).optional(),
  openingHours: z.array(openingHour).optional(),
});

export const locationUpdateSchema = locationCreateSchema.partial();

export const settingsPatchSchema = z.object({
  locationId: z.string().optional().nullable(),
  clubName: z.string().min(1).max(200).optional(),
  currency: z.string().optional(),
  priceIncludesTax: z.boolean().optional(),
  bookingCancelFreeHours: z.number().int().min(0).optional(),
  holdMinutes: z.number().int().min(1).optional(),
  maxAdvanceDays: z.number().int().min(1).optional(),
  minLeadMinutes: z.number().int().min(0).optional(),
  trialPricePaise: z.number().int().min(0).optional(),
  socialCountsTowardLimit: z.boolean().optional(),
  walkInMaxPerPhonePerDay: z.number().int().min(1).optional(),
  walkInRequiresPhone: z.boolean().optional(),
  lowStockDefault: z.number().int().min(0).optional(),
  invoicePrefix: z.string().optional(),
  receiptFooter: z.string().optional(),
  paymentsProvider: z.enum(['mock', 'razorpay']).optional(),
  posInvoiceMode: z.enum(['per_order', 'per_session']).optional(),
});

export const taxCreateSchema = z.object({
  name: z.string().min(1).max(100),
  ratePct: z.number().min(0).max(100),
  components: z
    .array(
      z.object({
        name: z.string().min(1),
        ratePct: z.number().min(0).max(100),
      }),
    )
    .optional(),
  appliesTo: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export const taxUpdateSchema = taxCreateSchema.partial();

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

export default {
  locationCreateSchema,
  locationUpdateSchema,
  settingsPatchSchema,
  taxCreateSchema,
  taxUpdateSchema,
  idParamsSchema,
};
