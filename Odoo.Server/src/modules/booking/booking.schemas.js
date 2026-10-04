import { z } from 'zod';

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

function normalizeIndianMobile(val) {
  let digits = String(val || '').replace(/\D+/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

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
      phone: z
        .string()
        .optional()
        .transform((val) => {
          if (val == null || String(val).trim() === '') return undefined;
          return normalizeIndianMobile(val);
        })
        .refine((digits) => digits == null || INDIAN_MOBILE.test(digits), {
          message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.',
        }),
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
}).superRefine((data, ctx) => {
  const memberId = data.memberId || data.bookedByMemberId;
  const type = data.type || (memberId ? 'member' : 'walk_in');
  if (type === 'walk_in' && !memberId && data.customer?.phone == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customer', 'phone'],
      message: 'Phone number is required.',
    });
  }
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
