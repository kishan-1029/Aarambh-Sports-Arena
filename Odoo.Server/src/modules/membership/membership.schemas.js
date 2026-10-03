import { z } from 'zod';

const durationSchema = z.object({
  months: z.number().int().positive(),
  pricePaise: z.number().int().min(0),
});

const entitlementsSchema = z
  .object({
    court: z
      .object({
        access: z.enum(['all', 'off_peak_only', 'none']).optional(),
        pricing: z
          .object({
            mode: z.enum(['free', 'discount_pct', 'fixed_paise']).optional(),
            value: z.number().nullable().optional(),
          })
          .optional(),
        maxBookingsPerDay: z.number().int().min(0).optional(),
        advanceBookingDays: z.number().int().min(0).optional(),
        sportKeys: z.array(z.string()).optional(),
      })
      .optional(),
    shopDiscountPct: z.number().min(0).max(100).optional(),
    barDiscountPct: z.number().min(0).max(100).optional(),
    guestPasses: z.number().int().min(0).optional(),
    perks: z.array(z.string()).optional(),
  })
  .optional();

export const planCreateSchema = z.object({
  key: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  colour: z.string().max(32).optional(),
  durations: z.array(durationSchema).min(1),
  eligibility: z
    .object({
      minAge: z.number().int().min(0).nullable().optional(),
      maxAge: z.number().int().min(0).nullable().optional(),
    })
    .optional(),
  entitlements: entitlementsSchema,
  taxId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isDemo: z.boolean().optional(),
});

export const planUpdateSchema = planCreateSchema.partial().omit({ key: true });

export const purchaseSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  months: z.number().int().positive(),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'online', 'mock']).optional(),
  startDate: z.string().optional(),
  isDemo: z.boolean().optional(),
});

export const renewSchema = z.object({
  months: z.number().int().positive().optional(),
});

export const upgradeSchema = z.object({
  planId: z.string().min(1),
});

export const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
  refund: z.boolean().optional(),
});

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

export default {
  planCreateSchema,
  planUpdateSchema,
  purchaseSchema,
  renewSchema,
  upgradeSchema,
  cancelSchema,
  idParamsSchema,
};
