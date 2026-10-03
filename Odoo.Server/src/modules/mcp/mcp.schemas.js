import { z } from 'zod';

export const periodSchema = z.enum(['today', 'week', 'month', 'custom']).default('today');

export const clubSummaryQuerySchema = z.object({
  period: periodSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const revenueQuerySchema = z.object({
  period: periodSchema.optional(),
  groupBy: z.enum(['stream', 'day', 'method']).optional().default('day'),
});

export const bookingSummaryQuerySchema = z.object({
  period: periodSchema.optional(),
  sport: z.string().optional(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sportId: z.string().optional(),
});

export const searchMembersQuerySchema = z.object({
  query: z.string().min(1).max(80),
  tier: z.string().optional(),
  status: z.string().optional(),
});

export const memberIdQuerySchema = z.object({
  memberId: z.string().optional(),
  memberCode: z.string().optional(),
});

export const expiringQuerySchema = z.object({
  withinDays: z.coerce.number().int().min(1).max(90).default(7),
});

export const prepareCancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const prepareCreateBookingSchema = z.object({
  courtId: z.string().min(1),
  startUtc: z.string().min(1),
  memberId: z.string().optional(),
  type: z.enum(['member', 'walk_in', 'trial', 'admin']).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMode: z.enum(['cash', 'card', 'upi', 'online', 'mock']).optional(),
});

export const confirmActionSchema = z.object({
  confirmationId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const cancelActionSchema = z.object({
  confirmationId: z.string().min(1),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z
    .array(z.enum(['mcp.read', 'mcp.write', 'mcp.admin']))
    .min(1)
    .default(['mcp.read']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export default {
  clubSummaryQuerySchema,
  revenueQuerySchema,
  bookingSummaryQuerySchema,
  availabilityQuerySchema,
  searchMembersQuerySchema,
  memberIdQuerySchema,
  expiringQuerySchema,
  prepareCancelBookingSchema,
  prepareCreateBookingSchema,
  confirmActionSchema,
  cancelActionSchema,
  createApiKeySchema,
};
