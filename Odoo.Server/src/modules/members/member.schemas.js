import { z } from 'zod';

const contactSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relation: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
  })
  .optional();

export const memberRegisterSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  dob: z.string().min(4),
  gender: z.string().max(32).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional().or(z.literal('')),
  photoUrl: z.string().max(500).optional(),
  emergencyContact: contactSchema,
  guardian: contactSchema,
  source: z.enum(['front_desk', 'website', 'mobile', 'lead_conversion']).optional(),
  isDemo: z.boolean().optional(),
});

export const memberUpdateSchema = memberRegisterSchema.partial();

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

export const qrParamsSchema = z.object({
  token: z.string().min(1),
});

export default {
  memberRegisterSchema,
  memberUpdateSchema,
  idParamsSchema,
  qrParamsSchema,
};
