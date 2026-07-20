import { z } from 'zod';

const blankToNull = z.preprocess((value) => value === '' ? null : value, z.string().trim().min(1).max(160).nullable().optional());
export const memberInputSchema = z.object({
  memberCode: z.string().trim().min(1).max(50),
  libraryCardNumber: z.string().trim().min(1).max(80),
  isStudent: z.boolean(),
  nis: blankToNull, nisn: blankToNull, studentCardNumber: blankToNull,
  fullName: z.string().trim().min(2).max(160),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  classId: z.preprocess((value) => value === '' ? null : value, z.uuid().nullable().optional()),
  studyGroupId: z.preprocess((value) => value === '' ? null : value, z.uuid().nullable().optional()),
  phone: blankToNull, email: z.preprocess((value) => value === '' ? null : value, z.email().nullable().optional()),
  joinedAt: z.iso.date().optional(), expiresAt: z.preprocess((value) => value === '' ? null : value, z.iso.date().nullable().optional()),
  isActive: z.boolean().default(true), notes: z.string().trim().max(1000).nullable().optional(),
}).superRefine((data, context) => {
  if (!data.isStudent) return;
  for (const [key, value] of Object.entries({ nis: data.nis, nisn: data.nisn, studentCardNumber: data.studentCardNumber, classId: data.classId, studyGroupId: data.studyGroupId })) {
    if (!value) context.addIssue({ code: 'custom', path: [key], message: 'Wajib diisi untuk siswa.' });
  }
});

export const memberUpdateSchema = memberInputSchema;
export const memberIdSchema = z.uuid();
export const memberListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''), isStudent: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(), classId: z.uuid().optional(),
});

export type MemberInput = z.infer<typeof memberInputSchema>;
