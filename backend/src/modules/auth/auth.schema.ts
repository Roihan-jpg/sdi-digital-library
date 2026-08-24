import { z } from 'zod';
import { appRoles } from './auth.types.js';

export const updateOwnProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(150).nullable().optional(),
    avatarPath: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict()
  .refine((body) => body.fullName !== undefined || body.avatarPath !== undefined, {
    message: 'Minimal satu field profil harus diberikan.',
  });

export const updateRoleSchema = z.object({ role: z.enum(appRoles) }).strict();
export const updateStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const linkMemberSchema = z.object({ memberId: z.uuid() }).strict();
const strongPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

export const changePasswordSchema = z
  .object({
    password: strongPasswordSchema,
  })
  .strict();
export const userIdSchema = z.uuid();
export const profileListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  role: z.enum(appRoles).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export const memberLinkCandidateListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
});

const accountBaseSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(150)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._@-]*$/)
    .transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(2).max(150),
  role: z.enum(['head_librarian', 'librarian', 'member', 'guest']),
  password: strongPasswordSchema,
});

export const createAccountSchema = accountBaseSchema.strict();
export const updateAccountSchema = z
  .object({
    username: accountBaseSchema.shape.username.optional(),
    fullName: accountBaseSchema.shape.fullName.optional(),
    role: accountBaseSchema.shape.role.optional(),
  })
  .strict()
  .refine(
    (body) => body.username !== undefined || body.fullName !== undefined || body.role !== undefined,
    {
      message: 'Minimal satu field akun harus diberikan.',
    },
  );
export const localLoginSchema = z
  .object({
    identifier: z.string().trim().min(3).max(150),
    password: z.string().min(1).max(128),
  })
  .strict();
export const updatePasswordSchema = z.object({ password: strongPasswordSchema }).strict();
