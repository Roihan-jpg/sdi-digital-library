import { z } from 'zod';

export const masterDataKinds = [
  'school-years', 'classes', 'study-groups', 'categories', 'authors', 'publishers', 'shelves',
  'replacement-cost-categories',
] as const;
export type MasterDataKind = (typeof masterDataKinds)[number];

const optionalText = z.string().trim().max(500).nullable().optional();
const active = z.boolean().optional();

const schemas: Record<MasterDataKind, z.ZodType<Record<string, unknown>>> = {
  'school-years': z.object({ name: z.string().trim().min(1).max(50), startsOn: z.iso.date().nullable().optional(), endsOn: z.iso.date().nullable().optional(), isActive: active }),
  classes: z.object({ schoolYearId: z.uuid().nullable().optional(), gradeLevel: z.number().int().min(1).max(6), name: z.string().trim().min(1).max(50), isActive: active }),
  'study-groups': z.object({ classId: z.uuid(), name: z.string().trim().min(1).max(80), homeroomTeacherName: optionalText, isActive: active }),
  categories: z.object({ parentId: z.uuid().nullable().optional(), name: z.string().trim().min(1).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: optionalText, isActive: active }),
  authors: z.object({ name: z.string().trim().min(1).max(160), biography: optionalText, isActive: active }),
  publishers: z.object({ name: z.string().trim().min(1).max(160), city: optionalText, website: z.url().nullable().optional(), isActive: active }),
  shelves: z.object({ code: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(120), locationDescription: optionalText, isActive: active }),
  'replacement-cost-categories': z.object({
    name: z.string().trim().min(1).max(120),
    lostChargeMode: z.enum(['fixed', 'percentage_of_price', 'full_book_price']),
    lostFixedAmount: z.number().min(0).optional(), lostPercentage: z.number().min(0).max(1000).optional(),
    damagedChargeMode: z.enum(['fixed', 'percentage_of_price', 'full_book_price']),
    damagedFixedAmount: z.number().min(0).optional(), damagedPercentage: z.number().min(0).max(1000).optional(),
    notes: optionalText, isActive: active,
  }),
};

export function parseMasterData(kind: MasterDataKind, value: unknown, partial = false): Record<string, unknown> {
  const schema = schemas[kind];
  return (partial ? (schema as z.ZodObject).partial() : schema).parse(value) as Record<string, unknown>;
}

export const masterIdSchema = z.uuid();
