import { z } from 'zod';

export const availabilityQuerySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sportId: z.string().min(1).optional(),
  days: z.coerce.number().int().min(1).max(14).optional(),
});

const optionalEmail = z.preprocess(
  (v) => (v == null || v === '' ? '' : v),
  z.union([z.literal(''), z.string().trim().email().max(160)]),
);

const interestList = z.preprocess((v) => {
  if (v == null || v === '') return [];
  return Array.isArray(v) ? v : [v];
}, z.array(z.string().max(80)).max(10));

export const enquiryBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(32),
  email: optionalEmail.optional().default(''),
  message: z.string().trim().max(2000).optional().default(''),
  interest: interestList.optional().default([]),
  companyName: z.string().trim().max(160).optional(),
  /** Honeypot — must stay empty */
  website: z.string().max(0).optional().default(''),
  isDemo: z.boolean().optional(),
});

export const trialBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(32),
  email: optionalEmail.optional().default(''),
  message: z.string().trim().max(2000).optional().default(''),
  sportId: z.string().min(1).optional(),
  courtId: z.string().min(1).optional(),
  startUtc: z.coerce.date().optional(),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  interest: interestList.optional().default(['trial']),
  /** Honeypot */
  website: z.string().max(0).optional().default(''),
  isDemo: z.boolean().optional(),
});

export default {
  availabilityQuerySchema,
  enquiryBodySchema,
  trialBodySchema,
};
