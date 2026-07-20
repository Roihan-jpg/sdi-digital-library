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
export const userIdSchema = z.uuid();
export const profileListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
