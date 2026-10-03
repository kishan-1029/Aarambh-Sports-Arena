import { z } from 'zod';

const addressSchema = z
  .object({
    label: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    phone: z.string().optional(),
    isDefault: z.boolean().optional(),
  })
  .optional();

export const customerCreateSchema = z.object({
  type: z.enum(['person', 'company']).optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(32).optional(),
  gstin: z.string().max(20).optional(),
  billingAddress: addressSchema,
  addresses: z.array(addressSchema).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  paymentTermsDays: z.number().int().min(0).optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

export default { customerCreateSchema, customerUpdateSchema, idParamsSchema };
