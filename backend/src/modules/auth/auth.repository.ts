import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import { hashLocalPassword, verifyLocalPassword } from './local-password.js';
import { createLocalSessionToken, verifyLocalSessionToken } from './local-session-token.js';
import type {
  AppProfile,
  AppRole,
  AuthContext,
  CreateAccountInput,
  LocalLoginResult,
  ManagedProfile,
  MemberSummary,
  ProfileListFilters,
  UpdateAccountInput,
  UpdateOwnProfileInput,
} from './auth.types.js';

interface ProfileRow {
  id: string;
  auth_user_id: string | null;
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

interface LocalAccountRow {
  profile_id: string;
  username: string;
  password_hash: string | null;
  last_sign_in_at: string | null;
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
      .eq('auth_user_id', userId)
      .single();
    if (error || !data)
      throw new AppError(403, 'PROFILE_UNAVAILABLE', 'Profil pengguna tidak tersedia.');
    return mapProfile(data as ProfileRow);
  }

  async getMember(accessToken: string, profileId: string): Promise<MemberSummary | null> {
    const { data, error } = await this.userClient(accessToken)
      .from('members')
      .select('id, member_code, card_number, full_name, is_student, is_active')
      .eq('user_id', profileId)
      .maybeSingle();
    if (error) throw new AppError(503, 'MEMBER_LOOKUP_FAILED', 'Data anggota belum dapat dimuat.');
    return data ? mapMember(data as MemberRow) : null;
  }

  async authenticateLocal(accessToken: string): Promise<AuthContext> {
    const token = verifyLocalSessionToken(this.config, accessToken);
    if (!token)
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Sesi tidak valid atau sudah berakhir.');
    const tokenHash = hashSessionToken(accessToken);
    const now = new Date().toISOString();
    const { data: session, error: sessionError } = await this.adminClient
      .from('local_auth_sessions')
      .select('profile_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (
      sessionError ||
      !session ||
      session.profile_id !== token.sub ||
      session.revoked_at ||
      session.expires_at <= now
    ) {
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Sesi tidak valid atau sudah berakhir.');
    }

    const profile = await this.getProfileById(session.profile_id);
    if (!profile.isActive)
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Akun Anda sedang tidak aktif.');
    const member = await this.getMemberByProfileId(profile.id);
    await this.adminClient
      .from('local_auth_sessions')
      .update({ last_seen_at: now })
      .eq('token_hash', tokenHash);
    return {
      accessToken,
      user: { id: profile.id, email: null },
      profile,
      member,
      authSource: 'local',
    };
  }

  async loginLocal(identifier: string, password: string): Promise<LocalLoginResult> {
    const username = identifier.trim().toLowerCase();
    const { data, error } = await this.adminClient
      .from('local_user_accounts')
      .select(
        'profile_id, username, password_hash, last_sign_in_at, profiles!inner(id, role, full_name, avatar_path, is_active, must_change_password)',
      )
      .ilike('username', username)
      .maybeSingle();
    if (error || !data) throw invalidCredentials();
    const account = data as LocalAccountRow & { profiles: ProfileRow | ProfileRow[] };
    const profile = mapProfile(relatedProfile(account.profiles));
    if (
      !profile.isActive ||
      !account.password_hash ||
      !(await verifyLocalPassword(password, account.password_hash))
    ) {
      throw invalidCredentials();
    }

    const expiry = new Date(Date.now() + 8 * 60 * 60 * 1_000);
    const accessToken = createLocalSessionToken(this.config, profile.id, randomUUID(), expiry);
    const expiresAt = expiry.toISOString();
    const { error: sessionError } = await this.adminClient.from('local_auth_sessions').insert({
      token_hash: hashSessionToken(accessToken),
      profile_id: profile.id,
      expires_at: expiresAt,
    });
    if (sessionError)
      throw new AppError(503, 'SESSION_CREATE_FAILED', 'Sesi belum dapat dibuat. Coba kembali.');
    await this.adminClient
      .from('local_user_accounts')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('profile_id', profile.id);
    return {
      accessToken,
      expiresAt,
      context: {
        accessToken,
        user: { id: profile.id, email: null },
        profile,
        member: await this.getMemberByProfileId(profile.id),
        authSource: 'local',
      },
    };
  }

  async updateOwnProfile(context: AuthContext, input: UpdateOwnProfileInput): Promise<AppProfile> {
    const updates: Record<string, string | null> = {};
    if ('fullName' in input) updates.full_name = input.fullName ?? null;
    if ('avatarPath' in input) updates.avatar_path = input.avatarPath ?? null;
    const { data, error } = await this.adminClient
      .from('profiles')
      .update(updates)
      .eq('id', context.profile.id)
      .select('id, role, full_name, avatar_path, is_active, must_change_password')
      .single();
    if (error || !data)
      throw new AppError(422, 'PROFILE_UPDATE_FAILED', 'Profil tidak dapat diperbarui.');
    return mapProfile(data as ProfileRow);
  }

  async listProfiles(_accessToken: string, page: number, limit: number) {
    const result = await this.listManagedProfiles(_accessToken, { page, limit });
    return { items: result.items, total: result.total };
  }

  async listManagedProfiles(_accessToken: string, filters: ProfileListFilters) {
    const { data, error } = await this.adminClient
      .from('profiles')
      .select(
        'id, auth_user_id, role, full_name, avatar_path, is_active, must_change_password, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error)
      throw new AppError(503, 'PROFILE_LIST_FAILED', 'Daftar pengguna belum dapat dimuat.');
    const rows = (data ?? []) as ProfileRow[];
    const ids = rows.map((row) => row.id);
    const [accountsResult, membersResult, authResult] = await Promise.all([
      ids.length
        ? this.adminClient
            .from('local_user_accounts')
            .select('profile_id, username, password_hash, last_sign_in_at')
            .in('profile_id', ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? this.adminClient
            .from('members')
            .select('id, user_id, member_code, full_name')
            .in('user_id', ids)
        : Promise.resolve({ data: [], error: null }),
      this.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (accountsResult.error || membersResult.error || authResult.error) {
      throw new AppError(503, 'PROFILE_LIST_FAILED', 'Daftar pengguna belum dapat dimuat.');
    }
    const accountsByProfile = new Map(
      (accountsResult.data ?? []).map((account) => [
        account.profile_id,
        account as LocalAccountRow,
      ]),
    );
    const membersByUser = new Map(
      (membersResult.data ?? []).map((member) => [member.user_id, member as LinkedMemberRow]),
    );
    const authById = new Map(authResult.data.users.map((user) => [user.id, user]));
    const merged: ManagedProfile[] = rows.map((row) => {
      const localAccount = accountsByProfile.get(row.id);
      const authUser = row.auth_user_id ? authById.get(row.auth_user_id) : undefined;
      const member = membersByUser.get(row.id);
      return {
        ...mapProfile(row),
        email: authUser?.email ?? null,
        username: localAccount?.username ?? null,
        authSource: row.auth_user_id ? 'supabase' : 'local',
        createdAt: row.created_at,
        lastSignInAt: localAccount?.last_sign_in_at ?? authUser?.last_sign_in_at ?? null,
        invitedAt: null,
        member: member
          ? { id: member.id, memberCode: member.member_code, fullName: member.full_name }
          : null,
      };
    });
    const needle = filters.search?.trim().toLocaleLowerCase('id-ID');
    const filtered = needle
      ? merged.filter((profile) =>
          [
            profile.fullName,
            profile.email,
            profile.username,
            profile.member?.fullName,
            profile.member?.memberCode,
          ]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLocaleLowerCase('id-ID').includes(needle)),
        )
      : merged;
    if (filters.role)
      filtered.splice(
        0,
        filtered.length,
        ...filtered.filter((profile) => profile.role === filters.role),
      );
    if (filters.isActive !== undefined)
      filtered.splice(
        0,
        filtered.length,
        ...filtered.filter((profile) => profile.isActive === filters.isActive),
      );
    const from = (filters.page - 1) * filters.limit;
    return { items: filtered.slice(from, from + filters.limit), total: filtered.length };
  }

  async createAccount(context: AuthContext, input: CreateAccountInput): Promise<ManagedProfile> {
    const passwordHash = await hashLocalPassword(input.password);
    const { data: profileData, error: profileError } = await this.adminClient
      .from('profiles')
      .insert({
        role: input.role,
        full_name: input.fullName,
        is_active: true,
        must_change_password: true,
      })
      .select(
        'id, auth_user_id, role, full_name, avatar_path, is_active, must_change_password, created_at',
      )
      .single();
    if (profileError || !profileData)
      throw databaseWriteError(profileError?.code, 'Akun belum dapat dibuat.');
    const profile = profileData as ProfileRow;
    const { error: accountError } = await this.adminClient.from('local_user_accounts').insert({
      profile_id: profile.id,
      username: input.username,
      password_hash: passwordHash,
      password_updated_at: new Date().toISOString(),
    });
    if (accountError) {
      await this.adminClient.from('profiles').update({ is_active: false }).eq('id', profile.id);
      throw databaseWriteError(
        accountError.code,
        'Username sudah digunakan atau akun belum dapat dibuat.',
      );
    }
    if (input.memberId) await this.linkMemberByProfileId(profile.id, input.memberId);
    await this.recordAuthAudit(context.profile.id, profile.id, 'LOCAL_ACCOUNT_CREATED', {
      username: input.username,
      role: input.role,
    });
    return {
      ...mapProfile(profile),
      email: null,
      username: input.username,
      authSource: 'local',
      createdAt: profile.created_at,
      lastSignInAt: null,
      invitedAt: null,
      member: null,
    };
  }

  async updateAccount(
    actorProfileId: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<AppProfile> {
    const { data, error } = await this.adminClient.rpc('update_local_user_account', {
      p_actor_profile_id: actorProfileId,
      p_user_id: userId,
      p_username: input.username ?? null,
      p_full_name: input.fullName ?? null,
      p_role: input.role ?? null,
    });
    if (error || !data) throw accountMutationError(error?.code, 'Akun belum dapat diperbarui.');
    return this.getProfileById(userId);
  }

  async deleteAccount(actorProfileId: string, userId: string): Promise<void> {
    const { data, error } = await this.adminClient.rpc('delete_local_user_account', {
      p_actor_profile_id: actorProfileId,
      p_user_id: userId,
    });
    if (error || !data) {
      if (error?.code === '23503') {
        throw new AppError(
          409,
          'ACCOUNT_HAS_HISTORY',
          'Akun memiliki histori transaksi dan tidak dapat dihapus. Nonaktifkan akun tersebut.',
        );
      }
      throw accountMutationError(error?.code, 'Akun belum dapat dihapus.');
    }
  }

  async setRole(_accessToken: string, userId: string, role: AppRole): Promise<void> {
    if (role === 'master_admin')
      throw new AppError(
        422,
        'MASTER_ADMIN_AUTH_REQUIRED',
        'Master admin hanya dapat dibuat melalui Supabase Auth.',
      );
    const { error } = await this.adminClient
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .is('auth_user_id', null);
    if (error)
      throw new AppError(422, 'ROLE_UPDATE_FAILED', 'Role pengguna tidak dapat diperbarui.');
  }

  async setActive(_accessToken: string, userId: string, isActive: boolean): Promise<AppProfile> {
    const { data, error } = await this.adminClient
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select('id, role, full_name, avatar_path, is_active, must_change_password')
      .single();
    if (error || !data)
      throw new AppError(422, 'STATUS_UPDATE_FAILED', 'Status pengguna tidak dapat diperbarui.');
    if (!isActive)
      await this.adminClient
        .from('local_auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('profile_id', userId)
        .is('revoked_at', null);
    return mapProfile(data as ProfileRow);
  }

  async linkMember(_accessToken: string, userId: string, memberId: string): Promise<void> {
    await this.linkMemberByProfileId(userId, memberId);
  }

  async logout(accessToken: string): Promise<void> {
    const { data } = await this.adminClient
      .from('local_auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashSessionToken(accessToken))
      .is('revoked_at', null)
      .select('token_hash');
    if (data?.length) return;
    await this.adminClient.auth.admin.signOut(accessToken, 'local');
  }

  async changePassword(context: AuthContext, password: string): Promise<void> {
    if (context.authSource === 'supabase') {
      const { error } = await this.adminClient.auth.admin.updateUserById(
        context.authUserId ?? context.user.id,
        { password },
      );
      if (error)
        throw new AppError(422, 'PASSWORD_UPDATE_FAILED', 'Kata sandi belum dapat diperbarui.');
    } else {
      const { error } = await this.adminClient
        .from('local_user_accounts')
        .update({
          password_hash: await hashLocalPassword(password),
          password_updated_at: new Date().toISOString(),
        })
        .eq('profile_id', context.profile.id);
      if (error)
        throw new AppError(422, 'PASSWORD_UPDATE_FAILED', 'Kata sandi belum dapat diperbarui.');
    }
    await this.adminClient
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', context.profile.id);
  }

  async setPassword(actorProfileId: string, userId: string, password: string): Promise<void> {
    const { data: profile, error: profileError } = await this.adminClient
      .from('profiles')
      .select('id, auth_user_id')
      .eq('id', userId)
      .single();
    if (profileError || !profile)
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Akun tidak ditemukan.');
    if (profile.auth_user_id)
      throw new AppError(
        422,
        'MASTER_ADMIN_PASSWORD_SELF_SERVICE',
        'Kata sandi master admin dikelola melalui Supabase Auth.',
      );
    const { error } = await this.adminClient
      .from('local_user_accounts')
      .update({
        password_hash: await hashLocalPassword(password),
        password_updated_at: new Date().toISOString(),
      })
      .eq('profile_id', userId);
    if (error)
      throw new AppError(422, 'PASSWORD_UPDATE_FAILED', 'Kata sandi belum dapat diperbarui.');
    await this.adminClient.from('profiles').update({ must_change_password: true }).eq('id', userId);
    await this.adminClient
      .from('local_auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('profile_id', userId)
      .is('revoked_at', null);
    await this.recordAuthAudit(actorProfileId, userId, 'LOCAL_PASSWORD_RESET', {});
  }

  private userClient(accessToken: string): SupabaseClient {
    return createUserSupabaseClient(this.config, accessToken);
  }

  private async getProfileById(profileId: string): Promise<AppProfile> {
    const { data, error } = await this.adminClient
      .from('profiles')
      .select('id, role, full_name, avatar_path, is_active, must_change_password')
      .eq('id', profileId)
      .single();
    if (error || !data)
      throw new AppError(403, 'PROFILE_UNAVAILABLE', 'Profil pengguna tidak tersedia.');
    return mapProfile(data as ProfileRow);
  }

  private async getMemberByProfileId(profileId: string): Promise<MemberSummary | null> {
    const { data, error } = await this.adminClient
      .from('members')
      .select('id, member_code, card_number, full_name, is_student, is_active')
      .eq('user_id', profileId)
      .maybeSingle();
    if (error) throw new AppError(503, 'MEMBER_LOOKUP_FAILED', 'Data anggota belum dapat dimuat.');
    return data ? mapMember(data as MemberRow) : null;
  }

  private async linkMemberByProfileId(profileId: string, memberId: string): Promise<void> {
    const { data: profile, error: profileError } = await this.adminClient
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', profileId)
      .single();
    if (profileError || !profile || !profile.is_active)
      throw new AppError(422, 'MEMBER_LINK_FAILED', 'Akun aktif tidak ditemukan.');
    const { error } = await this.adminClient
      .from('members')
      .update({ user_id: profileId })
      .eq('id', memberId)
      .or(`user_id.is.null,user_id.eq.${profileId}`);
    if (error)
      throw new AppError(422, 'MEMBER_LINK_FAILED', 'Akun tidak dapat dihubungkan ke anggota.');
    if (profile.role === 'guest')
      await this.adminClient.from('profiles').update({ role: 'member' }).eq('id', profileId);
  }

  private async recordAuthAudit(
    actorProfileId: string,
    targetProfileId: string,
    action: string,
    newData: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.adminClient
      .from('audit_logs')
      .insert({
        table_name: 'local_user_accounts',
        record_id: targetProfileId,
        action,
        old_data: null,
        new_data: newData,
        user_id: actorProfileId,
      });
    if (error)
      throw new AppError(
        503,
        'AUTH_AUDIT_FAILED',
        'Aksi selesai tetapi audit belum dapat dicatat.',
      );
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

function relatedProfile(value: ProfileRow | ProfileRow[]): ProfileRow {
  return Array.isArray(value) ? value[0]! : value;
}
function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
function invalidCredentials(): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Username atau kata sandi tidak benar.');
}
function databaseWriteError(code: string | undefined, message: string): AppError {
  return new AppError(
    code === '23505' ? 409 : 422,
    'ACCOUNT_CREATE_FAILED',
    code === '23505' ? 'Username sudah digunakan.' : message,
  );
}
function accountMutationError(code: string | undefined, message: string): AppError {
  if (code === '23505')
    return new AppError(409, 'USERNAME_ALREADY_USED', 'Username sudah digunakan.');
  if (code === 'P0001')
    return new AppError(
      422,
      'MASTER_ADMIN_ACCOUNT_PROTECTED',
      'Master admin tidak dapat diedit atau dihapus dari halaman ini.',
    );
  if (code === 'P0002') return new AppError(404, 'ACCOUNT_NOT_FOUND', 'Akun tidak ditemukan.');
  return new AppError(422, 'ACCOUNT_UPDATE_FAILED', message);
}
