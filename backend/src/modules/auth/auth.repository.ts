import type { SupabaseClient, User } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type {
  AppProfile,
  AppRole,
  AuthContext,
  CreateAccountInput,
  ManagedProfile,
  MemberSummary,
  ProfileListFilters,
  UpdateOwnProfileInput,
} from './auth.types.js';

interface ProfileRow {
  id: string;
  role: AppRole;
  full_name: string | null;
  avatar_path: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

interface MemberRow {
  id: string;
  member_code: string;
  card_number: string;
  full_name: string;
  is_student: boolean;
  is_active: boolean;
}

interface LinkedMemberRow {
  id: string;
  user_id: string;
  member_code: string;
  full_name: string;
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
      .select('id, role, full_name, avatar_path, is_active, must_change_password')
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
      .select('id, role, full_name, avatar_path, is_active, must_change_password')
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
      .select('id, role, full_name, avatar_path, is_active, must_change_password', { count: 'exact' })
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

  async listManagedProfiles(
    _accessToken: string,
    filters: ProfileListFilters,
  ): Promise<{ items: ManagedProfile[]; total: number }> {
    const from = (filters.page - 1) * filters.limit;
    let query = this.adminClient
      .from('profiles')
      .select('id, role, full_name, avatar_path, is_active, must_change_password, created_at')
      .order('created_at', { ascending: false });

    if (filters.role) query = query.eq('role', filters.role);
    if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);

    const { data, error } = await query.limit(1000);
    if (error) {
      throw new AppError(503, 'PROFILE_LIST_FAILED', 'Daftar pengguna belum dapat dimuat.');
    }

    const rows = (data ?? []) as ProfileRow[];
    const ids = rows.map((row) => row.id);
    const membersByUser = new Map<string, LinkedMemberRow>();
    if (ids.length > 0) {
      const { data: members, error: memberError } = await this.adminClient
        .from('members')
        .select('id, user_id, member_code, full_name')
        .in('user_id', ids);
      if (memberError) {
        throw new AppError(503, 'PROFILE_MEMBER_LIST_FAILED', 'Tautan member belum dapat dimuat.');
      }
      for (const member of (members ?? []) as LinkedMemberRow[]) {
        membersByUser.set(member.user_id, member);
      }
    }

    const { data: authData, error: authError } = await this.adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authError) {
      throw new AppError(503, 'AUTH_USER_LIST_FAILED', 'Identitas akun belum dapat dimuat.');
    }
    const authById = new Map(authData.users.map((user) => [user.id, user]));

    const merged = rows.map((row) => {
        const authUser = authById.get(row.id);
        const member = membersByUser.get(row.id);
        return {
          ...mapProfile(row),
          email: authUser?.email ?? null,
          createdAt: row.created_at,
          lastSignInAt: authUser?.last_sign_in_at ?? null,
          invitedAt: authUser?.invited_at ?? null,
          member: member
            ? { id: member.id, memberCode: member.member_code, fullName: member.full_name }
            : null,
        };
      });
    const needle = filters.search?.trim().toLocaleLowerCase('id-ID');
    const filtered = needle
      ? merged.filter((profile) =>
          [profile.fullName, profile.email, profile.member?.fullName, profile.member?.memberCode]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLocaleLowerCase('id-ID').includes(needle)),
        )
      : merged;

    return {
      items: filtered.slice(from, from + filters.limit),
      total: filtered.length,
    };
  }

  async createAccount(context: AuthContext, input: CreateAccountInput): Promise<ManagedProfile> {
    const authResult =
      input.deliveryMode === 'invite'
        ? await this.adminClient.auth.admin.inviteUserByEmail(input.email, {
            data: { full_name: input.fullName },
            redirectTo: `${this.config.APP_ORIGIN[0]}/ganti-kata-sandi`,
          })
        : await this.adminClient.auth.admin.createUser({
            email: input.email,
            password: input.temporaryPassword,
            email_confirm: true,
            user_metadata: { full_name: input.fullName },
          });

    if (authResult.error || !authResult.data.user) {
      throw new AppError(422, 'ACCOUNT_CREATE_FAILED', 'Akun Auth belum dapat dibuat.');
    }

    const user = authResult.data.user;
    const { data: profileData, error: profileError } = await this.adminClient
      .from('profiles')
      .update({
        role: input.role,
        full_name: input.fullName,
        is_active: true,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, role, full_name, avatar_path, is_active, must_change_password, created_at')
      .single();
    if (profileError || !profileData) {
      await this.adminClient.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });
      throw new AppError(
        503,
        'ACCOUNT_PROFILE_CREATE_FAILED',
        'Akun Auth dibuat tetapi profile gagal disiapkan dan telah dinonaktifkan.',
      );
    }

    if (input.memberId) {
      const { error: linkError } = await this.userClient(context.accessToken).rpc(
        'link_member_account',
        { p_member_id: input.memberId, p_user_id: user.id },
      );
      if (linkError) {
        throw new AppError(422, 'MEMBER_LINK_FAILED', 'Akun dibuat tetapi belum terhubung ke member.');
      }
    }

    await this.recordAuthAudit(context.user.id, user.id, 'ACCOUNT_CREATED', {
      email: input.email,
      role: input.role,
      deliveryMode: input.deliveryMode,
    });

    return {
      ...mapProfile(profileData as ProfileRow),
      email: user.email ?? input.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      invitedAt: user.invited_at ?? null,
      member: null,
    };
  }

  async sendInvitation(actorUserId: string, userId: string): Promise<void> {
    const user = await this.getAdminUser(userId);
    if (!user.email) throw new AppError(422, 'ACCOUNT_EMAIL_REQUIRED', 'Akun tidak memiliki email.');
    const { error } = await this.adminClient.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: `${this.config.APP_ORIGIN[0]}/masuk` },
    });
    if (error) throw new AppError(503, 'INVITATION_SEND_FAILED', 'Undangan belum dapat dikirim.');
    await this.recordAuthAudit(actorUserId, userId, 'INVITATION_SENT', { email: user.email });
  }

  async sendRecoveryEmail(actorUserId: string, userId: string): Promise<void> {
    const user = await this.getAdminUser(userId);
    if (!user.email) throw new AppError(422, 'ACCOUNT_EMAIL_REQUIRED', 'Akun tidak memiliki email.');
    const { error } = await this.adminClient.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${this.config.APP_ORIGIN[0]}/atur-ulang-kata-sandi`,
    });
    if (error) throw new AppError(503, 'RECOVERY_SEND_FAILED', 'Email pemulihan belum dapat dikirim.');
    await this.recordAuthAudit(actorUserId, userId, 'RECOVERY_SENT', { email: user.email });
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
      .select('id, role, full_name, avatar_path, is_active, must_change_password')
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

  async changePassword(userId: string, password: string): Promise<void> {
    const { error: authError } = await this.adminClient.auth.admin.updateUserById(userId, {
      password,
    });
    if (authError) {
      throw new AppError(422, 'PASSWORD_UPDATE_FAILED', 'Kata sandi belum dapat diperbarui.');
    }

    const { error: profileError } = await this.adminClient
      .from('profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (profileError) {
      throw new AppError(
        503,
        'PASSWORD_STATE_UPDATE_FAILED',
        'Kata sandi berubah, tetapi status akun belum dapat diperbarui. Coba simpan kembali.',
      );
    }
  }

  private userClient(accessToken: string): SupabaseClient {
    return createUserSupabaseClient(this.config, accessToken);
  }

  private async getAdminUser(userId: string): Promise<User> {
    const { data, error } = await this.adminClient.auth.admin.getUserById(userId);
    if (error || !data.user) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Akun tidak ditemukan.');
    return data.user;
  }

  private async recordAuthAudit(
    actorUserId: string,
    targetUserId: string,
    action: string,
    newData: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.adminClient.from('audit_logs').insert({
      table_name: 'auth.users',
      record_id: targetUserId,
      action,
      old_data: null,
      new_data: newData,
      user_id: actorUserId,
    });
    if (error) {
      throw new AppError(503, 'AUTH_AUDIT_FAILED', 'Aksi selesai tetapi audit belum dapat dicatat.');
    }
  }
}

function mapProfile(row: ProfileRow): AppProfile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    avatarPath: row.avatar_path,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
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
