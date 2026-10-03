import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const emptyToUndefined = (v) => (v === '' || v === null || v === undefined ? undefined : v);

const envSchema = z
  .object({
    APP_NAME: z.string().default('Arambh Sports Arena'),
    PORT: z.coerce.number().int().positive().default(7002),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MONGODB_URI: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    DATABASE: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SESSION_SECRET: z.string().min(8).default('dev-session-secret-change-me'),
    JWT_ACCESS_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    JWT_REFRESH_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    ADMIN_JWT_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    EMPLOYEE_JWT_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    JWT_EXPIRY: z.string().default('7d'),
    PAYMENTS_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
    CLUB_TIMEZONE: z.string().default('Asia/Kolkata'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
    ALLOWED_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
    SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
    MAIL_FROM: z.preprocess(emptyToUndefined, z.string().optional()),
    APP_URL_ADMIN: z.preprocess(emptyToUndefined, z.string().optional()),
    APP_URL_WEBSITE: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine((data, ctx) => {
    if (!data.MONGODB_URI && !data.DATABASE && data.NODE_ENV !== 'test') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MONGODB_URI or DATABASE is required (ADR-0003)',
        path: ['MONGODB_URI'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  console.error(`Invalid environment configuration: ${details}`);
  process.exit(1);
}

const env = parsed.data;
const mongoUri = env.MONGODB_URI || env.DATABASE || '';
const corsOriginsRaw = env.CORS_ORIGINS || env.ALLOWED_ORIGINS || '';
const corsOrigins = corsOriginsRaw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Validated runtime config. Prefer this over process.env in new code.
 * Never log mongoUri or secrets.
 */
export const config = Object.freeze({
  appName: env.APP_NAME,
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  mongoUri,
  sessionSecret: env.SESSION_SECRET,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET || env.ADMIN_JWT_SECRET_KEY,
    refreshSecret: env.JWT_REFRESH_SECRET || env.EMPLOYEE_JWT_SECRET_KEY,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
    expiry: env.JWT_EXPIRY,
  },
  paymentsProvider: env.PAYMENTS_PROVIDER,
  clubTimezone: env.CLUB_TIMEZONE,
  logLevel: env.LOG_LEVEL,
  corsOrigins,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD || env.SMTP_PASS,
    from: env.MAIL_FROM || `"${env.APP_NAME}" <no-reply@example.com>`,
  },
  urls: {
    admin: env.APP_URL_ADMIN,
    website: env.APP_URL_WEBSITE,
  },
});

export default config;
