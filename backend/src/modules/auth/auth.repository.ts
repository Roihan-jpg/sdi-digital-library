import type { SupabaseClient, User } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type {
  AppProfile,
  AppRole,
  AuthContext,
  MemberSummary,
  UpdateOwnProfileInput,
} from './auth.types.js';

interface ProfileRow {
  id: string;
  role: AppRole;
  full_name: string | null;
  avatar_path: string | null;
  is_active: boolean;
}

interface MemberRow {
  id: string;
  member_code: string;
  card_number: string;
  full_name: string;
  is_student: boolean;
  is_active: boolean;
}

export class AuthRepository {
  private readonly adminClient: SupabaseClient;

  constructor(private readonly config: AppConfig) {
    this.adminClient = createAdminSupabaseClient(config);
  }

  async verifyUser(accessToken: string): Promise<User> {
    const client = this.userClient(accessToken);
    const { data, error } = await client.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Sesi tidak valid atau sudah berakhir.');
    }

    return data.user;
  }

  async getProfile(accessToken: string, userId: string): Promise<AppProfile> {
    const { data, error } = await this.userClient(accessToken)
      .from('profiles')
      .select('id, role, full_name, avatar_path, is_active')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new AppError(403, 'PROFILE_UNAVAILABLE', 'Profil pengguna tidak tersedia.');
    }

    return mapProfile(data as ProfileRow);
  }

  async getMember(accessToken: string, userId: string): Promise<MemberSummary | null> {
    const { data, error } = await this.userClient(accessToken)
      .from('members')
      .select('id, member_code, card_number, full_name, is_student, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new AppError(503, 'MEMBER_LOOKUP_FAILED', 'Data anggota belum dapat dimuat.');
    }

    return data ? mapMember(data as MemberRow) : null;
  }

  async updateOwnProfile(
    context: AuthContext,
    input: UpdateOwnProfileInput,
  ): Promise<AppProfile> {
    const updates: Record<string, string | null> = {};
    if ('fullName' in input) updates['full_name'] = input.fullName ?? null;
    if ('avatarPath' in input) updates['avatar_path'] = input.avatarPath ?? null;

    const { data, error } = await this.userClient(context.accessToken)
      .from('profiles')
      .update(updates)
      .eq('id', context.user.id)
      .select('id, role, full_name, avatar_path, is_active')
      .single();

    if (error || !data) {
      throw new AppError(422, 'PROFILE_UPDATE_FAILED', 'Profil tidak dapat diperbarui.');
    }

    return mapProfile(data as ProfileRow);
  }

  async listProfiles(
    accessToken: string,
    page: number,
    limit: number,
  ): Promise<{ items: AppProfile[]; total: number }> {
    const from = (page - 1) * limit;
    const { data, error, count } = await this.userClient(accessToken)
      .from('profiles')
      .select('id, role, full_name, avatar_path, is_active', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      throw new AppError(503, 'PROFILE_LIST_FAILED', 'Daftar pengguna belum dapat dimuat.');
    }

    return {
      items: (data as ProfileRow[]).map(mapProfile),
      total: count ?? 0,
    };
  }

  async setRole(accessToken: string, userId: string, role: AppRole): Promise<void> {
    const { error } = await this.userClient(accessToken).rpc('set_user_role', {
      p_user_id: userId,
      p_role: role,
    });

    if (error) {
      throw new AppError(422, 'ROLE_UPDATE_FAILED', 'Role pengguna tidak dapat diperbarui.');
    }
  }

  async setActive(accessToken: string, userId: string, isActive: boolean): Promise<AppProfile> {
    const { data, error } = await this.userClient(accessToken)
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select('id, role, full_name, avatar_path, is_active')
      .single();

    if (error || !data) {
      throw new AppError(422, 'STATUS_UPDATE_FAILED', 'Status pengguna tidak dapat diperbarui.');
    }

    return mapProfile(data as ProfileRow);
  }

  async linkMember(accessToken: string, userId: string, memberId: string): Promise<void> {
    const { error } = await this.userClient(accessToken).rpc('link_member_account', {
      p_member_id: memberId,
      p_user_id: userId,
    });

    if (error) {
      throw new AppError(422, 'MEMBER_LINK_FAILED', 'Akun tidak dapat dihubungkan ke anggota.');
    }
  }

  async logout(accessToken: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.signOut(accessToken, 'local');
    if (error) {
      throw new AppError(503, 'LOGOUT_FAILED', 'Sesi belum dapat diakhiri. Silakan coba lagi.');
    }
  }

  private userClient(accessToken: string): SupabaseClient {
    return createUserSupabaseClient(this.config, accessToken);
  }
}

function mapProfile(row: ProfileRow): AppProfile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    avatarPath: row.avatar_path,
    isActive: row.is_active,
  };
}

function mapMember(row: MemberRow): MemberSummary {
  return {
    id: row.id,
    memberCode: row.member_code,
    cardNumber: row.card_number,
    fullName: row.full_name,
    isStudent: row.is_student,
    isActive: row.is_active,
  };
}
