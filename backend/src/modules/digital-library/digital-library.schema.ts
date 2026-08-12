import { z } from 'zod';

const nullableText = (max: number) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().trim().max(max).nullable());
const nullableUuid = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.uuid().nullable(),
);
const nullableInteger = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().min(minimum).max(maximum).nullable(),
  );
const formBoolean = z.preprocess(
  (value) => value === true || value === 'true' || value === '1',
  z.boolean(),
);

export const digitalCollectionInputSchema = z.object({
  title: z.string().trim().min(1).max(250),
  slug: z.string().trim().min(1).max(250).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: nullableText(10_000),
  mediaType: z.enum(['ebook', 'module', 'video']),
  categoryId: nullableUuid,
  authorText: nullableText(500),
  publisherText: nullableText(500),
  publicationYear: nullableInteger(1000, 2100),
  durationSeconds: nullableInteger(0, 86_400),
  isDownloadable: formBoolean,
  isPublished: formBoolean,
});

export const digitalCatalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().max(100).default(''),
  categoryId: z.uuid().optional(),
  mediaType: z.enum(['ebook', 'module', 'video']).optional(),
  sort: z.enum(['latest', 'popular', 'title']).default('latest'),
});

export const digitalActionSchema = z.object({
  action: z.enum(['view', 'play', 'download']),
});

export const idSchema = z.uuid();
export const slugSchema = z.string().trim().min(1).max(250).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export type DigitalCollectionInput = z.infer<typeof digitalCollectionInputSchema>;
export type DigitalCatalogQuery = z.infer<typeof digitalCatalogQuerySchema>;
export type DigitalAction = z.infer<typeof digitalActionSchema>['action'];
