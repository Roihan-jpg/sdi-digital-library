import { z } from 'zod';

const uuid = z.uuid();
const optionalNote = z.string().trim().max(500).optional();

export const scanSchema = z.object({ code: z.string().trim().min(1).max(120) });
export const checkoutSchema = z.object({
  cardNumber: z.string().trim().min(1).max(120),
  inventoryCodes: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
  notes: optionalNote,
  reservationId: uuid.optional(),
});
export const returnSchema = z.object({
  inventoryCode: z.string().trim().min(1).max(120),
  condition: z.enum(['good', 'damaged', 'lost']),
  notes: optionalNote,
});
export const renewSchema = z.object({ loanItemId: uuid, reason: optionalNote });
export const reservationCreateSchema = z.object({ bookTitleId: uuid, notes: optionalNote });
export const reservationActionSchema = z.object({ inventoryCode: z.string().trim().min(1).max(120).optional() });
export const reservationRejectSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export const finePaymentSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  method: z.enum(['cash', 'bank_transfer', 'other']).default('cash'),
  referenceNumber: z.string().trim().max(120).optional(),
  notes: optionalNote,
});
export const groupVisitSchema = z.object({
  classId: uuid,
  studyGroupId: uuid.optional(),
  teacherName: z.string().trim().min(2).max(160),
  participantCount: z.coerce.number().int().positive().max(1000),
  notes: optionalNote,
});
export const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().max(40).optional(),
  memberId: uuid.optional(),
});
export const idSchema = uuid;

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
export type FinePaymentInput = z.infer<typeof finePaymentSchema>;
export type GroupVisitInput = z.infer<typeof groupVisitSchema>;
export type ListInput = z.infer<typeof listSchema>;
