import { AppError } from '../../common/errors/app-error.js';
import { AuthRepository } from './auth.repository.js';
import type {
  AppProfile,
  AppRole,
  AuthContext,
  AuthServicePort,
  CreateAccountInput,
  ManagedProfile,
  ProfileListFilters,
  ProfileServicePort,
  UpdateAccountInput,
  UpdateOwnProfileInput,
} from './auth.types.js';

export class AuthService implements AuthServicePort {
  constructor(private readonly repository: AuthRepository) {}

  async authenticate(accessToken: string): Promise<AuthContext> {
    const localContext = await this.repository.authenticateLocal(accessToken);
    if (localContext) return localContext;

    const user = await this.repository.verifyUser(accessToken);
    const profile = await this.repository.getProfile(accessToken, user.id);
    if (!profile.isActive)
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Akun Anda sedang tidak aktif.');
    return {
      accessToken,
      user: { id: profile.id, email: user.email ?? null },
      profile,
      member: await this.repository.getMember(accessToken, profile.id),
      authSource: 'supabase',
      authUserId: user.id,
    };
  }

  async logout(accessToken: string): Promise<void> {
    await this.repository.logout(accessToken);
  }

  async changePassword(context: AuthContext, password: string): Promise<void> {
    await this.repository.changePassword(context, password);
  }

  async loginLocal(identifier: string, password: string) {
    return this.repository.loginLocal(identifier, password);
  }
}

export class ProfileService implements ProfileServicePort {
  constructor(private readonly repository: AuthRepository) {}

  async listProfiles(
    context: AuthContext,
    page: number,
    limit: number,
  ): Promise<{ items: AppProfile[]; total: number; page: number; limit: number }> {
    const result = await this.repository.listProfiles(context.accessToken, page, limit);
    return { ...result, page, limit };
  }

  async getOwnContext(context: AuthContext): Promise<AuthContext> {
    return context;
  }

  async updateOwnProfile(context: AuthContext, input: UpdateOwnProfileInput): Promise<AppProfile> {
    return this.repository.updateOwnProfile(context, input);
  }

  async setRole(context: AuthContext, userId: string, role: AppRole): Promise<void> {
    await this.repository.setRole(context.accessToken, userId, role);
  }

  async setActive(context: AuthContext, userId: string, isActive: boolean): Promise<AppProfile> {
    return this.repository.setActive(context.accessToken, userId, isActive);
  }

  async linkMember(context: AuthContext, userId: string, memberId: string): Promise<void> {
    await this.repository.linkMember(context.accessToken, userId, memberId);
  }

  async listManagedProfiles(
    context: AuthContext,
    filters: ProfileListFilters,
  ): Promise<{ items: ManagedProfile[]; total: number; page: number; limit: number }> {
    const result = await this.repository.listManagedProfiles(context.accessToken, filters);
    return { ...result, page: filters.page, limit: filters.limit };
  }

  async createAccount(context: AuthContext, input: CreateAccountInput): Promise<ManagedProfile> {
    return this.repository.createAccount(context, input);
  }

  async updateAccount(
    context: AuthContext,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<AppProfile> {
    return this.repository.updateAccount(context.profile.id, userId, input);
  }

  async deleteAccount(context: AuthContext, userId: string): Promise<void> {
    await this.repository.deleteAccount(context.profile.id, userId);
  }

  async updatePassword(context: AuthContext, userId: string, password: string): Promise<void> {
    await this.repository.updatePassword(context.profile.id, userId, password);
  }
}
