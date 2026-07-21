import { z } from 'zod';

export const reportKinds = [
  'popular-books',
  'active-students',
  'overdue',
  'fines',
  'damaged-lost',
  'inventory',
  'visits',
  'digital-activity',
  'accreditation',
] as const;

export const reportKindSchema = z.enum(reportKinds);
export type ReportKind = z.infer<typeof reportKindSchema>;

const today = () => new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
};

export const reportFilterSchema = z
  .object({
    from: z.iso.date().default(thirtyDaysAgo),
    to: z.iso.date().default(today),
    classId: z.uuid().optional(),
    studyGroupId: z.uuid().optional(),
    categoryId: z.uuid().optional(),
    status: z.string().trim().max(40).optional(),
    search: z.string().trim().max(100).default(''),
    limit: z.coerce.number().int().min(1).max(1000).default(1000),
  })
  .refine((value) => value.from <= value.to, {
    message: 'Tanggal awal tidak boleh melebihi tanggal akhir.',
    path: ['from'],
  });

export const dashboardFilterSchema = z
  .object({
    from: z.iso.date().default(thirtyDaysAgo),
    to: z.iso.date().default(today),
  })
  .refine((value) => value.from <= value.to, { path: ['from'] });

export const exportQuerySchema = reportFilterSchema.and(
  z.object({ format: z.enum(['pdf', 'xlsx']) }),
);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().trim().max(max).nullable(),
  );

export const schoolIdentitySchema = z.object({
  schoolName: z.string().trim().min(1).max(200),
  schoolAddress: optionalText(500),
  schoolPhone: optionalText(80),
  schoolEmail: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.email().max(200).nullable(),
  ),
  schoolLogoPath: optionalText(500),
});

export type ReportFilters = z.infer<typeof reportFilterSchema>;
export type SchoolIdentityInput = z.infer<typeof schoolIdentitySchema>;
