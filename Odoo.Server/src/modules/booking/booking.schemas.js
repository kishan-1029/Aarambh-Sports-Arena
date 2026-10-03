import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().min(1) });

export const bookingCreateSchema = z.object({
  courtId: z.string().min(1),
  startUtc: z.coerce.date(),
  type: z.enum(['member', 'walk_in', 'trial', 'admin', 'coaching']).optional(),
  memberId: z.string().optional().nullable(),
  bookedByMemberId: z.string().optional().nullable(),
  customer: z
    .object({
      customerId: z.string().optional().nullable(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional()
    .nullable(),
  participants: z
    .array(
      z.object({
        memberId: z.string().optional().nullable(),
        name: z.string().optional(),
        isGuest: z.boolean().optional(),
      }),
    )
    .optional(),
  channel: z
    .enum(['mobile', 'website', 'front_desk', 'phone', 'ai', 'mcp', 'admin'])
    .optional(),
  payment: z
    .object({
      mode: z.enum(['online', 'free', 'desk', 'cash', 'card', 'upi', 'wallet', 'mock']),
    })
    .optional(),
  paymentMode: z.enum(['online', 'free', 'desk', 'cash', 'card', 'upi', 'wallet', 'mock']).optional(),
  notes: z.string().max(1000).optional(),
  priceOverridePaise: z.number().int().min(0).optional().nullable(),
  priceOverrideReason: z.string().max(500).optional(),
  idempotencyKey: z.string().max(120).optional().nullable(),
  isDemo: z.boolean().optional(),
});

export const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
  forceRefund: z.boolean().optional(),
  refundMethod: z.enum(['original', 'wallet', 'none']).optional(),
});

export const rescheduleSchema = z.object({
  startUtc: z.coerce.date(),
  courtId: z.string().optional(),
});

export const availabilityQuerySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sportId: z.string().optional(),
  courtIds: z.string().optional(),
  forMember: z.string().optional(),
});

export const calendarQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sportId: z.string().optional(),
});

export const socialSessionCreateSchema = z.object({
  courtIds: z.array(z.string().min(1)).min(1),
  sportId: z.string().min(1),
  start: z.coerce.date(),
  end: z.coerce.date(),
  title: z.string().max(120).optional(),
  capacity: z.number().int().positive(),
  pricePerPlayer: z
    .object({
      memberPaise: z.number().int().optional(),
      guestPaise: z.number().int().optional(),
    })
    .optional(),
  membersOnly: z.boolean().optional(),
  isDemo: z.boolean().optional(),
});

export const socialJoinSchema = z.object({
  memberId: z.string().optional().nullable(),
  name: z.string().max(120).optional(),
  phone: z.string().max(32).optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'pay_at_desk', 'not_required']).optional(),
  isDemo: z.boolean().optional(),
});

export default {
  idParamsSchema,
  bookingCreateSchema,
  cancelSchema,
  rescheduleSchema,
  availabilityQuerySchema,
  calendarQuerySchema,
  socialSessionCreateSchema,
  socialJoinSchema,
};
