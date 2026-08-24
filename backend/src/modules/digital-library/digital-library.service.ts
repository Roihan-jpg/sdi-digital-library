import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import { pageRange } from '../../common/http/pagination.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type { AuthContext } from '../auth/auth.types.js';
import type {
  DigitalAction,
  DigitalCatalogQuery,
  DigitalCollectionInput,
  DigitalUploadSessionInput,
} from './digital-library.schema.js';

const mainMimeTypes = new Set([
  'application/pdf',
  'video/mp4',
  'video/webm',
]);
const coverMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const fileLimit = 100 * 1024 * 1024;
const coverLimit = 5 * 1024 * 1024;
const uploadSessionTtlMs = 110 * 60 * 1000;
const selectFields =
  'id,category_id,title,slug,description,media_type,author_text,publisher_text,publication_year,cover_path,mime_type,file_size_bytes,duration_seconds,is_downloadable,is_published,published_at,created_at,updated_at,categories(name)';

export class DigitalLibraryService {
  private readonly admin: SupabaseClient;
  constructor(private readonly config: AppConfig) {
    this.admin = createAdminSupabaseClient(config);
  }

  async listPublic(filters: DigitalCatalogQuery) {
    const { from, to } = pageRange(filters.page, filters.limit);
    let query = this.admin
      .from('digital_collections')
      .select(selectFields, { count: 'exact' })
      .eq('is_published', true);
    if (filters.search) {
      query = query.textSearch('search_vector', filters.search.split(/\s+/).join(' & '), {
        type: 'plain',
      });
    }
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.mediaType) query = query.eq('media_type', filters.mediaType);
    if (filters.sort === 'title') query = query.order('title');
    else query = query.order('published_at', { ascending: false, nullsFirst: false });
    const { data, error, count } = await query.range(from, to);
    if (error) throw unavailable('Koleksi digital belum dapat dimuat.');
    const items = await this.withPopularity(data ?? []);
    if (filters.sort === 'popular') items.sort((a, b) => b.popularity - a.popularity);
    return { items, total: count ?? 0 };
  }

  async getPublic(slug: string) {
    const { data, error } = await this.admin
      .from('digital_collections')
      .select(selectFields)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();
    if (error || !data) throw notFound();
    return (await this.withPopularity([data]))[0];
  }

  async listManagement() {
    const { data, error } = await this.admin
      .from('digital_collections')
      .select(selectFields)
      .order('updated_at', { ascending: false });
    if (error) throw unavailable('Data pengelolaan koleksi belum dapat dimuat.');
    return this.withPopularity(data ?? []);
  }

  async create(
    context: AuthContext,
    input: DigitalCollectionInput,
    file: Express.Multer.File,
    cover?: Express.Multer.File,
  ) {
    validateMainFile(file, input.mediaType);
    if (cover) validateCover(cover);
    const id = randomUUID();
    const filePath = objectPath(id, 'file', file.originalname);
    const coverPath = cover ? objectPath(id, 'cover', cover.originalname) : null;
    await this.upload('digital-library', filePath, file);
    try {
      if (cover && coverPath) await this.upload('covers', coverPath, cover);
      const { data, error } = await this.user(context)
        .from('digital_collections')
        .insert({
          id,
          ...databaseInput(input),
          published_at: input.isPublished ? new Date().toISOString() : null,
          file_path: filePath,
          cover_path: coverPath,
          mime_type: file.mimetype,
          file_size_bytes: file.size,
          created_by: context.user.id,
        })
        .select(selectFields)
        .single();
      if (error || !data) throw writeError(error?.code);
      return publicDto(data, this.coverUrl(coverPath), 0);
    } catch (error) {
      await this.removeObjects(filePath, coverPath);
      throw error;
    }
  }

  async update(
    context: AuthContext,
    id: string,
    input: DigitalCollectionInput,
    file?: Express.Multer.File,
    cover?: Express.Multer.File,
  ) {
    const existing = await this.findManaged(id);
    if (file) validateMainFile(file, input.mediaType);
    if (cover) validateCover(cover);
    const newFilePath = file ? objectPath(id, 'file', file.originalname) : null;
    const newCoverPath = cover ? objectPath(id, 'cover', cover.originalname) : null;
    if (file && newFilePath) await this.upload('digital-library', newFilePath, file);
    try {
      if (cover && newCoverPath) await this.upload('covers', newCoverPath, cover);
      const { data, error } = await this.user(context)
        .from('digital_collections')
        .update({
          ...databaseInput(input),
          published_at: input.isPublished
            ? existing['is_published']
              ? existing['published_at']
              : new Date().toISOString()
            : null,
          ...(file
            ? { file_path: newFilePath, mime_type: file.mimetype, file_size_bytes: file.size }
            : {}),
          ...(cover ? { cover_path: newCoverPath } : {}),
        })
        .eq('id', id)
        .select(selectFields)
        .single();
      if (error || !data) throw writeError(error?.code);
      if (file) await this.removeObjects(String(existing['file_path']), null);
      if (cover) await this.removeObjects(null, nullableString(existing['cover_path']));
      return publicDto(data, this.coverUrl(nullableString(data['cover_path'])), 0);
    } catch (error) {
      await this.removeObjects(newFilePath, newCoverPath);
      throw error;
    }
  }

  async createUploadSession(context: AuthContext, input: DigitalUploadSessionInput) {
    if (input.mainFile) validateMainDescriptor(input.mainFile, input.mediaType);
    if (input.coverFile) validateCoverDescriptor(input.coverFile);
    if (input.operation === 'update') await this.findManaged(input.collectionId);

    const id = randomUUID();
    const mainPath = input.mainFile ? objectPath(id, 'file', input.mainFile.name) : null;
    const coverPath = input.coverFile ? objectPath(id, 'cover', input.coverFile.name) : null;
    const expiresAt = new Date(Date.now() + uploadSessionTtlMs).toISOString();
    const { error: insertError } = await this.admin.from('digital_upload_sessions').insert({
      id,
      created_by: context.user.id,
      target_collection_id: input.operation === 'update' ? input.collectionId : null,
      operation: input.operation,
      main_path: mainPath,
      main_mime_type: input.mainFile?.mimeType ?? null,
      main_size_bytes: input.mainFile?.size ?? null,
      cover_path: coverPath,
      cover_mime_type: input.coverFile?.mimeType ?? null,
      cover_size_bytes: input.coverFile?.size ?? null,
      expires_at: expiresAt,
    });
    if (insertError) throw unavailable('Sesi unggah belum dapat disiapkan.');

    try {
      const [mainUpload, coverUpload] = await Promise.all([
        mainPath ? this.signedUpload('digital-library', mainPath) : null,
        coverPath ? this.signedUpload('covers', coverPath) : null,
      ]);
      return { id, expiresAt, mainUpload, coverUpload };
    } catch (error) {
      await this.admin.from('digital_upload_sessions').delete().eq('id', id);
      throw error;
    }
  }

  async finalizeUploadSession(context: AuthContext, id: string, input: DigitalCollectionInput) {
    const session = await this.claimUploadSession(context, id);
    const operation = String(session['operation']);
    const mainPath = nullableString(session['main_path']);
    const coverPath = nullableString(session['cover_path']);
    let collectionWritten = false;
    let previousMainPath: string | null = null;
    let previousCoverPath: string | null = null;
    try {
      await this.assertSessionActive(session, 'finalizing');
      const mainFile = mainPath
        ? await this.assertStoredObject('digital-library', mainPath, session, 'main')
        : null;
      if (coverPath) await this.assertStoredObject('covers', coverPath, session, 'cover');
      let result: Record<string, unknown>;
      if (operation === 'create') {
        if (!mainPath || !mainFile) {
          throw new AppError(409, 'DIGITAL_UPLOAD_INCOMPLETE', 'File utama belum selesai diunggah.');
        }
        const { data, error } = await this.user(context)
          .from('digital_collections')
          .insert({
            id: randomUUID(),
            ...databaseInput(input),
            published_at: input.isPublished ? new Date().toISOString() : null,
            file_path: mainPath,
            cover_path: coverPath,
            mime_type: mainFile.mimeType,
            file_size_bytes: mainFile.size,
            created_by: context.user.id,
          })
          .select(selectFields)
          .single();
        if (error || !data) throw writeError(error?.code);
        result = data as Record<string, unknown>;
        collectionWritten = true;
      } else {
        const collectionId = nullableString(session['target_collection_id']);
        if (!collectionId) throw new AppError(409, 'DIGITAL_UPLOAD_SESSION_INVALID', 'Sesi unggah tidak valid.');
        const existing = await this.findManaged(collectionId);
        const { data, error } = await this.user(context)
          .from('digital_collections')
          .update({
            ...databaseInput(input),
            published_at: input.isPublished
              ? existing['is_published']
                ? existing['published_at']
                : new Date().toISOString()
              : null,
            ...(mainPath && mainFile
              ? { file_path: mainPath, mime_type: mainFile.mimeType, file_size_bytes: mainFile.size }
              : {}),
            ...(coverPath ? { cover_path: coverPath } : {}),
          })
          .eq('id', collectionId)
          .select(selectFields)
          .single();
        if (error || !data) throw writeError(error?.code);
        result = data as Record<string, unknown>;
        collectionWritten = true;
        previousMainPath = mainPath ? nullableString(existing['file_path']) : null;
        previousCoverPath = coverPath ? nullableString(existing['cover_path']) : null;
      }
      const { error: sessionError } = await this.admin
        .from('digital_upload_sessions')
        .update({ status: 'finalized', finalized_at: new Date().toISOString() })
        .eq('id', id)
        .eq('created_by', context.user.id)
        .eq('status', 'finalizing');
      if (sessionError) throw unavailable('Status unggahan belum dapat diselesaikan.');
      await this.removeObjects(previousMainPath, previousCoverPath);
      return publicDto(result, this.coverUrl(nullableString(result['cover_path'])), 0);
    } catch (error) {
      if (!collectionWritten) {
        await this.removeObjects(mainPath, coverPath);
        await this.admin
          .from('digital_upload_sessions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', id)
          .eq('created_by', context.user.id)
          .eq('status', 'finalizing');
      }
      throw error;
    }
  }

  async cancelUploadSession(context: AuthContext, id: string) {
    const session = await this.findOwnedUploadSession(context, id);
    await this.assertSessionActive(session);
    await this.removeObjects(nullableString(session['main_path']), nullableString(session['cover_path']));
    const { error } = await this.admin
      .from('digital_upload_sessions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', context.user.id)
      .eq('status', 'pending');
    if (error) throw unavailable('Sesi unggah belum dapat dibatalkan.');
  }

  async purgeExpiredUploadSessions() {
    const now = new Date().toISOString();
    const { data: expired, error: expiredError } = await this.admin
      .from('digital_upload_sessions')
      .select('id,status,main_path,cover_path')
      .in('status', ['pending', 'finalizing'])
      .lt('expires_at', now)
      .limit(100);
    const { data: inactive, error: inactiveError } = await this.admin
      .from('digital_upload_sessions')
      .select('id,status,main_path,cover_path')
      .in('status', ['cancelled', 'expired'])
      .order('created_at', { ascending: false })
      .limit(100);
    if (expiredError || inactiveError) {
      throw unavailable('Sesi unggah kedaluwarsa belum dapat dibersihkan.');
    }
    for (const session of [...(expired ?? []), ...(inactive ?? [])]) {
      const row = session as Record<string, unknown>;
      const mainPath = nullableString(row['main_path']);
      const coverPath = nullableString(row['cover_path']);
      if (
        String(row['status']) === 'finalizing' &&
        await this.uploadPathsAreReferenced(mainPath, coverPath)
      ) {
        await this.admin
          .from('digital_upload_sessions')
          .update({ status: 'finalized', finalized_at: new Date().toISOString() })
          .eq('id', String(row['id']))
          .eq('status', 'finalizing');
        continue;
      }
      await this.removeObjects(mainPath, coverPath);
      if (!['pending', 'finalizing'].includes(String(row['status']))) continue;
      await this.admin
        .from('digital_upload_sessions')
        .update({ status: 'expired' })
        .eq('id', String(row['id']))
        .in('status', ['pending', 'finalizing']);
    }
    return { expired: expired?.length ?? 0, cleanedInactive: inactive?.length ?? 0 };
  }

  async remove(context: AuthContext, id: string) {
    const existing = await this.findManaged(id);
    const { error } = await this.user(context).from('digital_collections').delete().eq('id', id);
    if (error) throw new AppError(409, 'DIGITAL_DELETE_FAILED', 'Koleksi belum dapat dihapus.');
    await this.removeObjects(
      String(existing['file_path']),
      nullableString(existing['cover_path']),
    );
  }

  async access(context: AuthContext, id: string, action: DigitalAction) {
    const staff = ['master_admin', 'head_librarian', 'librarian'].includes(context.profile.role);
    let query = this.admin
      .from('digital_collections')
      .select('id,title,file_path,mime_type,is_downloadable,is_published')
      .eq('id', id);
    if (!staff) query = query.eq('is_published', true);
    const { data, error } = await query.single();
    if (error || !data) throw notFound();
    if (action === 'download' && !data.is_downloadable) {
      throw new AppError(403, 'DOWNLOAD_DISABLED', 'Koleksi ini tidak dapat diunduh.');
    }
    if (data.is_published) {
      const { error: logError } = await this.user(context).rpc('record_digital_access', {
        p_collection_id: id,
        p_action: action,
      });
      if (logError) throw unavailable('Aktivitas koleksi belum dapat dicatat.');
    }
    const { data: signed, error: signedError } = await this.admin.storage
      .from('digital-library')
      .createSignedUrl(String(data.file_path), 300, {
        download: action === 'download' ? String(data.title) : false,
      });
    if (signedError || !signed) throw unavailable('File koleksi belum dapat dibuka.');
    return { url: signed.signedUrl, expiresIn: 300, mimeType: data.mime_type };
  }

  private async withPopularity(rows: Record<string, unknown>[]) {
    const ids = rows.map((row) => String(row['id']));
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data } = await this.admin
        .from('digital_access_logs')
        .select('digital_collection_id')
        .in('digital_collection_id', ids)
        .limit(10_000);
      for (const log of data ?? []) {
        const id = String(log.digital_collection_id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return rows.map((row) =>
      publicDto(row, this.coverUrl(nullableString(row['cover_path'])), counts.get(String(row['id'])) ?? 0),
    );
  }

  private async findManaged(id: string) {
    const { data, error } = await this.admin
      .from('digital_collections')
      .select('id,file_path,cover_path,is_published,published_at')
      .eq('id', id)
      .single();
    if (error || !data) throw notFound();
    return data as Record<string, unknown>;
  }

  private async findOwnedUploadSession(context: AuthContext, id: string) {
    const { data, error } = await this.admin
      .from('digital_upload_sessions')
      .select('*')
      .eq('id', id)
      .eq('created_by', context.user.id)
      .single();
    if (error || !data) {
      throw new AppError(404, 'DIGITAL_UPLOAD_SESSION_NOT_FOUND', 'Sesi unggah tidak ditemukan.');
    }
    return data as Record<string, unknown>;
  }

  private async claimUploadSession(context: AuthContext, id: string) {
    const { data, error } = await this.admin
      .from('digital_upload_sessions')
      .update({ status: 'finalizing' })
      .eq('id', id)
      .eq('created_by', context.user.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (error || !data) {
      throw new AppError(409, 'DIGITAL_UPLOAD_SESSION_INACTIVE', 'Sesi unggah sudah tidak aktif.');
    }
    return data as Record<string, unknown>;
  }

  private async assertSessionActive(
    session: Record<string, unknown>,
    expectedStatus: 'pending' | 'finalizing' = 'pending',
  ) {
    if (String(session['status']) !== expectedStatus) {
      throw new AppError(409, 'DIGITAL_UPLOAD_SESSION_INACTIVE', 'Sesi unggah sudah tidak aktif.');
    }
    if (new Date(String(session['expires_at'])).getTime() <= Date.now()) {
      await this.removeObjects(nullableString(session['main_path']), nullableString(session['cover_path']));
      await this.admin
        .from('digital_upload_sessions')
        .update({ status: 'expired' })
        .eq('id', String(session['id']))
        .eq('status', expectedStatus);
      throw new AppError(409, 'DIGITAL_UPLOAD_SESSION_EXPIRED', 'Sesi unggah telah kedaluwarsa. Mulai unggahan lagi.');
    }
  }

  private async signedUpload(bucket: 'covers' | 'digital-library', path: string) {
    const { data, error } = await this.admin.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw unavailable('Token unggah belum dapat dibuat.');
    return { bucket, path, token: data.token };
  }

  private async assertStoredObject(
    bucket: 'covers' | 'digital-library',
    path: string,
    session: Record<string, unknown>,
    kind: 'main' | 'cover',
  ) {
    const slashIndex = path.lastIndexOf('/');
    const directory = path.slice(0, slashIndex);
    const filename = path.slice(slashIndex + 1);
    const { data, error } = await this.admin.storage.from(bucket).list(directory, { search: filename });
    const object = (data ?? []).find((entry) => entry.name === filename);
    const metadata = object?.metadata;
    const expectedMime = nullableString(session[`${kind}_mime_type`]);
    const expectedSize = Number(session[`${kind}_size_bytes`]);
    const mimeType = metadata?.mimetype ?? null;
    const size = metadata?.size ?? Number.NaN;
    if (error || !object || !expectedMime || !Number.isFinite(expectedSize) || mimeType !== expectedMime || size !== expectedSize) {
      throw new AppError(409, 'DIGITAL_UPLOAD_INCOMPLETE', 'File unggahan belum lengkap atau tidak sesuai. Unggah kembali file tersebut.');
    }
    return { mimeType: expectedMime, size: expectedSize };
  }

  private async uploadPathsAreReferenced(mainPath: string | null, coverPath: string | null) {
    const conditions = [
      ...(mainPath ? [`file_path.eq.${mainPath}`] : []),
      ...(coverPath ? [`cover_path.eq.${coverPath}`] : []),
    ];
    if (!conditions.length) return false;
    const { data } = await this.admin
      .from('digital_collections')
      .select('file_path,cover_path')
      .or(conditions.join(','))
      .limit(1);
    return Boolean(
      data?.some(
        (collection) =>
          collection.file_path === mainPath || collection.cover_path === coverPath,
      ),
    );
  }

  private async upload(bucket: 'covers' | 'digital-library', path: string, file: Express.Multer.File) {
    const { error } = await this.admin.storage.from(bucket).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) throw unavailable('File belum dapat diunggah.');
  }

  private async removeObjects(filePath: string | null, coverPath: string | null) {
    if (filePath) await this.admin.storage.from('digital-library').remove([filePath]);
    if (coverPath) await this.admin.storage.from('covers').remove([coverPath]);
  }

  private coverUrl(path: string | null) {
    return path ? this.admin.storage.from('covers').getPublicUrl(path).data.publicUrl : null;
  }

  private user(context: AuthContext) {
    return createUserSupabaseClient(this.config, context.accessToken);
  }
}

export function validateMainFile(file: Express.Multer.File, mediaType: string) {
  if (!mainMimeTypes.has(file.mimetype) || file.size > fileLimit || !safeName(file.originalname) || !hasExpectedSignature(file)) {
    throw new AppError(400, 'DIGITAL_FILE_INVALID', 'Format, nama, atau ukuran file utama tidak valid (maksimal 100 MB).');
  }
  const validForType =
    ((mediaType === 'ebook' || mediaType === 'module') && file.mimetype === 'application/pdf') ||
    (mediaType === 'video' && file.mimetype.startsWith('video/'));
  if (!validForType) throw new AppError(400, 'DIGITAL_MEDIA_MISMATCH', 'Jenis media tidak sesuai dengan file utama.');
}

export function validateCover(file: Express.Multer.File) {
  if (!coverMimeTypes.has(file.mimetype) || file.size > coverLimit || !safeName(file.originalname) || !hasExpectedSignature(file)) {
    throw new AppError(400, 'DIGITAL_COVER_INVALID', 'Cover harus JPG, PNG, atau WebP maksimal 5 MB.');
  }
}

function validateMainDescriptor(
  file: { name: string; mimeType: string; size: number },
  mediaType: string,
) {
  if (!mainMimeTypes.has(file.mimeType) || file.size > fileLimit || !safeName(file.name)) {
    throw new AppError(400, 'DIGITAL_FILE_INVALID', 'Format, nama, atau ukuran file utama tidak valid (maksimal 100 MB).');
  }
  const validForType =
    ((mediaType === 'ebook' || mediaType === 'module') && file.mimeType === 'application/pdf') ||
    (mediaType === 'video' && file.mimeType.startsWith('video/'));
  if (!validForType) throw new AppError(400, 'DIGITAL_MEDIA_MISMATCH', 'Jenis media tidak sesuai dengan file utama.');
}

function validateCoverDescriptor(file: { name: string; mimeType: string; size: number }) {
  if (!coverMimeTypes.has(file.mimeType) || file.size > coverLimit || !safeName(file.name)) {
    throw new AppError(400, 'DIGITAL_COVER_INVALID', 'Cover harus JPG, PNG, atau WebP maksimal 5 MB.');
  }
}

function hasExpectedSignature(file: Express.Multer.File): boolean {
  const bytes = file.buffer;
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString('ascii');
  switch (file.mimetype) {
    case 'application/pdf':
      return ascii(0, 5) === '%PDF-';
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'video/mp4':
      return ascii(4, 8) === 'ftyp';
    case 'video/webm':
      return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}

function safeName(name: string) {
  return name.length <= 180 && !/[\\/\0]/.test(name) && /^[\p{L}\p{N} ._()-]+$/u.test(name);
}
function objectPath(id: string, kind: 'file' | 'cover', original: string) {
  return `digital/${id}/${kind}-${randomUUID()}${extname(original).toLowerCase()}`;
}
function databaseInput(input: DigitalCollectionInput) {
  return {
    category_id: input.categoryId,
    title: input.title,
    slug: input.slug,
    description: input.description,
    media_type: input.mediaType,
    author_text: input.authorText,
    publisher_text: input.publisherText,
    publication_year: input.publicationYear,
    duration_seconds: input.durationSeconds,
    is_downloadable: input.isDownloadable,
    is_published: input.isPublished,
  };
}
function publicDto(row: Record<string, unknown>, coverUrl: string | null, popularity: number) {
  const { cover_path: _coverPath, ...safe } = row;
  return { ...safe, coverUrl, popularity };
}
function nullableString(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}
function notFound() {
  return new AppError(404, 'DIGITAL_COLLECTION_NOT_FOUND', 'Koleksi digital tidak ditemukan.');
}
function unavailable(message: string) {
  return new AppError(503, 'DIGITAL_LIBRARY_UNAVAILABLE', message);
}
function writeError(code?: string) {
  return new AppError(
    code === '23505' ? 409 : 422,
    'DIGITAL_COLLECTION_WRITE_FAILED',
    code === '23505' ? 'Slug sudah digunakan.' : 'Metadata koleksi belum dapat disimpan.',
  );
}
