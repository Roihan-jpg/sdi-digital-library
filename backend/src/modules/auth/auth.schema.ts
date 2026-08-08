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
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

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

const accountBaseSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  fullName: z.string().trim().min(2).max(150),
  role: z.enum(appRoles),
  memberId: z.uuid().optional(),
});

export const createAccountSchema = z.discriminatedUnion('deliveryMode', [
  accountBaseSchema.extend({ deliveryMode: z.literal('invite') }).strict(),
  accountBaseSchema
    .extend({
      deliveryMode: z.literal('temporaryPassword'),
      temporaryPassword: strongPasswordSchema,
    })
    .strict(),
]);
