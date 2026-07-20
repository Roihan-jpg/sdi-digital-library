import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import { pageRange } from '../../common/http/pagination.js';
import type { AppConfig } from '../../config/env.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type { AuthContext } from '../auth/auth.types.js';
import type { MasterDataKind } from './master-data.schema.js';

const definitions: Record<MasterDataKind, { table: string; search: string }> = {
  'school-years': { table: 'school_years', search: 'name' }, classes: { table: 'classes', search: 'name' },
  'study-groups': { table: 'study_groups', search: 'name' }, categories: { table: 'categories', search: 'name' },
  authors: { table: 'authors', search: 'name' }, publishers: { table: 'publishers', search: 'name' },
  shelves: { table: 'shelves', search: 'name' },
  'replacement-cost-categories': { table: 'replacement_cost_categories', search: 'name' },
};

export class MasterDataService {
  constructor(private readonly config: AppConfig) {}

  async list(context: AuthContext, kind: MasterDataKind, page: number, limit: number, search: string) {
    const { from, to } = pageRange(page, limit);
    const definition = definitions[kind];
    let query = this.client(context).from(definition.table).select('*', { count: 'exact' });
    if (search) query = query.ilike(definition.search, `%${search}%`);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw dataError('MASTER_DATA_LIST_FAILED', 'Data referensi belum dapat dimuat.', error.code);
    return { items: data ?? [], total: count ?? 0 };
  }

  async create(context: AuthContext, kind: MasterDataKind, input: Record<string, unknown>) {
    const { data, error } = await this.client(context).from(definitions[kind].table).insert(toSnake(input)).select().single();
    if (error) throw dataError('MASTER_DATA_CREATE_FAILED', 'Data referensi tidak dapat ditambahkan.', error.code);
    return data;
  }

  async update(context: AuthContext, kind: MasterDataKind, id: string, input: Record<string, unknown>) {
    const { data, error } = await this.client(context).from(definitions[kind].table).update(toSnake(input)).eq('id', id).select().single();
    if (error) throw dataError('MASTER_DATA_UPDATE_FAILED', 'Data referensi tidak dapat diperbarui.', error.code);
    return data;
  }

  async remove(context: AuthContext, kind: MasterDataKind, id: string): Promise<void> {
    const { error } = await this.client(context).from(definitions[kind].table).delete().eq('id', id);
    if (error) throw dataError('MASTER_DATA_DELETE_FAILED', 'Data masih dipakai atau tidak dapat dihapus.', error.code);
  }

  private client(context: AuthContext): SupabaseClient { return createUserSupabaseClient(this.config, context.accessToken); }
}

function toSnake(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value]));
}

function dataError(code: string, message: string, databaseCode?: string): AppError {
  return new AppError(databaseCode === '23505' ? 409 : 422, code, databaseCode === '23505' ? 'Data dengan nilai unik yang sama sudah ada.' : message);
}
