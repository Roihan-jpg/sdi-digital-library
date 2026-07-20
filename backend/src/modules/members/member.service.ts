import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import { pageRange } from '../../common/http/pagination.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type { AuthContext } from '../auth/auth.types.js';
import type { MemberInput } from './member.schema.js';

export interface MemberFilters { page: number; limit: number; search: string; isStudent?: string | undefined; isActive?: string | undefined; classId?: string | undefined }

export class MemberService {
  private readonly admin: SupabaseClient;
  constructor(private readonly config: AppConfig) { this.admin = createAdminSupabaseClient(config); }

  async list(context: AuthContext, filters: MemberFilters) {
    const { from, to } = pageRange(filters.page, filters.limit);
    let query = this.client(context).from('members').select('*, classes(name), study_groups(name)', { count: 'exact' });
    if (filters.search) query = query.textSearch('search_vector', filters.search.split(/\s+/).join(' & '), { type: 'plain' });
    if (filters.isStudent) query = query.eq('is_student', filters.isStudent === 'true');
    if (filters.isActive) query = query.eq('is_active', filters.isActive === 'true');
    if (filters.classId) query = query.eq('class_id', filters.classId);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw new AppError(503, 'MEMBER_LIST_FAILED', 'Daftar member belum dapat dimuat.');
    return { items: data ?? [], total: count ?? 0 };
  }

  async get(context: AuthContext, id: string) {
    const { data, error } = await this.client(context).from('members').select('*, classes(name), study_groups(name)').eq('id', id).single();
    if (error || !data) throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member tidak ditemukan.'); return data;
  }

  async create(context: AuthContext, input: MemberInput) {
    const { data, error } = await this.client(context).from('members').insert(toRow(input, context.user.id)).select().single();
    if (error) throw memberWriteError(error.code); return data;
  }

  async update(context: AuthContext, id: string, input: MemberInput) {
    const { data, error } = await this.client(context).from('members').update(toRow(input)).eq('id', id).select().single();
    if (error) throw memberWriteError(error.code); return data;
  }

  async remove(context: AuthContext, id: string): Promise<void> {
    const { error } = await this.client(context).from('members').delete().eq('id', id);
    if (error) throw new AppError(409, 'MEMBER_DELETE_FAILED', 'Member memiliki data terkait dan tidak dapat dihapus. Nonaktifkan member sebagai gantinya.');
  }

  async history(id: string) {
    const { data, error } = await this.admin.from('audit_logs').select('id, action, changed_at, changed_by, old_data, new_data').eq('table_name', 'members').eq('record_id', id).order('changed_at', { ascending: false }).limit(50);
    if (error) throw new AppError(503, 'MEMBER_HISTORY_FAILED', 'Histori member belum dapat dimuat.'); return data ?? [];
  }

  private client(context: AuthContext): SupabaseClient { return createUserSupabaseClient(this.config, context.accessToken); }
}

function toRow(input: MemberInput, createdBy?: string): Record<string, unknown> {
  return { member_code: input.memberCode, card_number: input.libraryCardNumber, is_student: input.isStudent,
    nis: input.isStudent ? input.nis : null, nisn: input.isStudent ? input.nisn : null,
    student_card_number: input.isStudent ? input.studentCardNumber : null, full_name: input.fullName,
    gender: input.gender, class_id: input.isStudent ? input.classId : null, study_group_id: input.isStudent ? input.studyGroupId : null,
    phone: input.phone, email: input.email, joined_at: input.joinedAt, expires_at: input.expiresAt,
    is_active: input.isActive, notes: input.notes, ...(createdBy ? { created_by: createdBy } : {}) };
}
function memberWriteError(code?: string): AppError { return new AppError(code === '23505' ? 409 : 422, 'MEMBER_WRITE_FAILED', code === '23505' ? 'NIS, NISN, kode member, atau nomor kartu sudah digunakan.' : 'Data member tidak dapat disimpan.'); }
