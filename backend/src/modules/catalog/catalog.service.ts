import type { SupabaseClient } from '@supabase/supabase-js';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { AppError } from '../../common/errors/app-error.js';
import { pageRange } from '../../common/http/pagination.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type { AuthContext } from '../auth/auth.types.js';
import type { BookCopyInput, BookTitleInput } from './catalog.schema.js';

export interface CatalogFilters { page: number; limit: number; search: string; categoryId?: string | undefined; status?: string | undefined }
export class CatalogService {
  private readonly admin: SupabaseClient;
  constructor(private readonly config: AppConfig) { this.admin = createAdminSupabaseClient(config); }
  async listPublic(filters: CatalogFilters) {
    const { from, to } = pageRange(filters.page, filters.limit);
    const copiesRelation = filters.status
      ? 'book_copies!inner(status)'
      : 'book_copies(status)';
    let query = this.admin.from('book_titles').select(`id,catalog_code,isbn,title,subtitle,publication_year,synopsis,cover_path,categories(name),publishers(name),book_authors(author_order,authors(name)),${copiesRelation}`, { count: 'exact' }).eq('is_active', true).eq('is_published', true);
    if (filters.search) query = query.textSearch('search_vector', filters.search.split(/\s+/).join(' & '), { type: 'plain' });
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.status) query = query.eq('book_copies.status', filters.status);
    const { data, error, count } = await query.order('title').range(from, to);
    if (error) throw new AppError(503, 'CATALOG_LIST_FAILED', 'Katalog belum dapat dimuat.');
    const items = (data ?? []).map((row) => publicBook(row as Record<string, unknown>));
    return { items, total: count ?? 0 };
  }
  async getPublic(id: string) { const { data, error } = await this.admin.from('book_titles').select('id,catalog_code,isbn,title,subtitle,publication_year,edition,language,page_count,synopsis,cover_path,categories(name),publishers(name),book_authors(author_order,authors(name)),book_copies(status)').eq('id', id).eq('is_active', true).eq('is_published', true).single(); if (error || !data) throw new AppError(404, 'BOOK_NOT_FOUND', 'Buku tidak ditemukan.'); return publicBook(data as Record<string, unknown>); }
  async createTitle(context: AuthContext, input: BookTitleInput) { const client = this.client(context); const { authorIds, ...title } = input; const { data, error } = await client.from('book_titles').insert(toSnake({ ...title, createdBy: context.user.id })).select().single(); if (error || !data) throw writeError(error?.code); if (authorIds.length) { const { error: authorError } = await client.from('book_authors').insert(authorIds.map((authorId, index) => ({ book_title_id: data.id, author_id: authorId, author_order: index + 1 }))); if (authorError) throw new AppError(422, 'BOOK_AUTHORS_FAILED', 'Judul tersimpan tetapi pengarang belum dapat ditautkan.'); } return data; }
  async updateTitle(context: AuthContext, id: string, input: BookTitleInput) { const client = this.client(context); const { authorIds, ...title } = input; const { data, error } = await client.from('book_titles').update(toSnake(title)).eq('id', id).select().single(); if (error) throw writeError(error.code); await client.from('book_authors').delete().eq('book_title_id', id); if (authorIds.length) { const { error: authorError } = await client.from('book_authors').insert(authorIds.map((authorId, index) => ({ book_title_id: id, author_id: authorId, author_order: index + 1 }))); if (authorError) throw new AppError(422, 'BOOK_AUTHORS_FAILED', 'Pengarang buku belum dapat diperbarui.'); } return data; }
  async createCopy(context: AuthContext, input: BookCopyInput) { const { data, error } = await this.client(context).from('book_copies').insert(toSnake({ ...input, createdBy: context.user.id })).select().single(); if (error) throw writeError(error.code, true); return data; }
  async updateCopy(context: AuthContext, id: string, input: BookCopyInput) { const { data, error } = await this.client(context).from('book_copies').update(toSnake(input)).eq('id', id).select().single(); if (error) throw writeError(error.code, true); return data; }
  async removeTitle(context: AuthContext,id:string){const{error}=await this.client(context).from('book_titles').delete().eq('id',id);if(error)throw new AppError(409,'BOOK_DELETE_FAILED','Judul masih memiliki eksemplar atau transaksi terkait.');}
  async removeCopy(context: AuthContext,id:string){const{error}=await this.client(context).from('book_copies').delete().eq('id',id);if(error)throw new AppError(409,'COPY_DELETE_FAILED','Eksemplar memiliki transaksi terkait dan tidak dapat dihapus.');}
  async history(id: string) { const { data, error } = await this.admin.from('audit_logs').select('id,action,changed_at,changed_by,old_data,new_data').eq('table_name','book_copies').eq('record_id',id).order('changed_at',{ascending:false}).limit(50); if(error) throw new AppError(503,'COPY_HISTORY_FAILED','Histori eksemplar belum dapat dimuat.'); return data ?? []; }
  async labels(copyIds: string[], format: 'barcode'|'qr'|'both'): Promise<string> { const { data, error } = await this.admin.from('book_copies').select('id,inventory_code,book_titles(title)').in('id', copyIds); if(error) throw new AppError(503,'LABEL_DATA_FAILED','Data label belum dapat dimuat.'); const labels = await Promise.all((data ?? []).map(async (copy) => { const payload = inventoryPayload(copy.inventory_code as string); const barcode = format !== 'qr' ? bwipjs.toSVG({ bcid:'code128', text:payload, includetext:true, scale:2, height:10 }) : ''; const qr = format !== 'barcode' ? await QRCode.toString(payload,{type:'svg',margin:1,width:120}) : ''; return `<article><strong>${escapeHtml(bookTitle(copy.book_titles))}</strong><div>${barcode}${qr}</div><small>${escapeHtml(payload)}</small></article>`; })); return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Label inventaris</title><style>@page{margin:10mm}body{font:12px sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}article{border:1px dashed #777;padding:5mm;text-align:center;break-inside:avoid}svg{max-width:100%;height:auto}div{display:flex;align-items:center;justify-content:center;gap:4mm}</style></head><body>${labels.join('')}</body></html>`; }
  private client(context: AuthContext): SupabaseClient { return createUserSupabaseClient(this.config, context.accessToken); }
}
export function publicBook(row: Record<string, unknown>) { const copies = Array.isArray(row['book_copies']) ? row['book_copies'] as Record<string, unknown>[] : []; const { book_copies: _copies, ...metadata } = row; return { ...metadata, stock: { total: copies.length, available: copies.filter((copy) => copy['status'] === 'available').length } }; }
function toSnake(input: Record<string, unknown>) { return Object.fromEntries(Object.entries(input).map(([key,value]) => [key.replace(/[A-Z]/g,(letter)=>`_${letter.toLowerCase()}`), value])); }
function writeError(code?: string, copy=false) { return new AppError(code === '23505' ? 409 : 422, copy ? 'COPY_WRITE_FAILED' : 'BOOK_WRITE_FAILED', code === '23505' ? (copy ? 'Kode inventaris sudah digunakan.' : 'Kode katalog atau ISBN sudah digunakan.') : 'Data buku tidak dapat disimpan.'); }
function bookTitle(value: unknown): string { if (Array.isArray(value)) return String((value[0] as Record<string,unknown> | undefined)?.['title'] ?? 'Buku'); return String((value as Record<string,unknown> | null)?.['title'] ?? 'Buku'); }
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!));}
export function inventoryPayload(inventoryCode:string):string{return inventoryCode;}
