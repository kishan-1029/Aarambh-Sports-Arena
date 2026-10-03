import { z } from 'zod';

const hourSchema = z.object({
  dow: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

const peakWindowSchema = z.object({
  dow: z.array(z.number().int().min(0).max(6)).optional(),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
});

export const idParamsSchema = z.object({ id: z.string().min(1) });

export const sportCreateSchema = z.object({
  key: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  icon: z.string().max(80).optional(),
  sessionMinutes: z.number().int().positive().optional(),
  slotStepMinutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  isDemo: z.boolean().optional(),
});

export const sportUpdateSchema = sportCreateSchema.partial().omit({ key: true });

export const courtCreateSchema = z.object({
  sportId: z.string().min(1),
  locationId: z.string().optional().nullable(),
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(32),
  surface: z.string().max(80).optional(),
  indoor: z.boolean().optional(),
  floodlit: z.boolean().optional(),
  status: z.enum(['active', 'maintenance', 'archived']).optional(),
  operatingHours: z.array(hourSchema).optional(),
  pricing: z
    .object({
      walkInPaise: z
        .object({ peak: z.number().int(), offPeak: z.number().int() })
        .optional(),
      memberBasePaise: z
        .object({ peak: z.number().int(), offPeak: z.number().int() })
        .optional(),
      peakWindows: z.array(peakWindowSchema).optional(),
    })
    .optional(),
  taxId: z.string().optional().nullable(),
  allowSocialPlay: z.boolean().optional(),
  capacity: z.number().int().positive().optional(),
  isDemo: z.boolean().optional(),
});

export const courtUpdateSchema = courtCreateSchema.partial().omit({ sportId: true });

export const courtBlockCreateSchema = z.object({
  courtId: z.string().min(1),
  start: z.coerce.date(),
  end: z.coerce.date(),
  reason: z.enum(['maintenance', 'event', 'coaching', 'social_play', 'tournament']),
  note: z.string().max(500).optional(),
  force: z.boolean().optional(),
  isDemo: z.boolean().optional(),
});

export default {
  idParamsSchema,
  sportCreateSchema,
  sportUpdateSchema,
  courtCreateSchema,
  courtUpdateSchema,
  courtBlockCreateSchema,
};
