import { z } from 'zod';

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable();

export const librarySettingsUpdateSchema = z
  .object({
    maxActiveLoans: z.number().int().min(1).max(10).optional(),
    loanPeriodDays: z.number().int().min(1).max(60).optional(),
    maxRenewals: z.number().int().min(0).max(5).optional(),
    renewalDays: z.number().int().min(1).max(30).optional(),
    overdueFinePerDay: z.number().min(0).max(1_000_000).optional(),
    reservationHoldHours: z.number().int().min(1).max(168).optional(),
    currencyCode: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
    timezoneName: z.string().trim().min(3).max(100).optional(),
    schoolName: z.string().trim().min(2).max(200).optional(),
    schoolAddress: nullableText(500).optional(),
    schoolPhone: nullableText(30).optional(),
    schoolEmail: z.email().nullable().optional(),
    schoolLogoPath: nullableText(500).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Minimal satu setting harus diberikan.');

const listSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const auditFiltersSchema = z.object({
  ...listSchema,
  tableName: z.string().trim().min(1).max(100).optional(),
  action: z.string().trim().min(1).max(100).optional(),
  userId: z.uuid().optional(),
  recordId: z.string().trim().min(1).max(200).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});

export const auditIdSchema = z.coerce.number().int().positive();

export const systemEventFiltersSchema = z.object({
  ...listSchema,
  level: z.enum(['warning', 'error']).optional(),
  source: z.enum(['backend', 'auth', 'database', 'storage', 'maintenance']).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});
