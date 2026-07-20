import { AppError } from '../../common/errors/app-error.js';
import { AuthRepository } from './auth.repository.js';
import type {
  AppProfile,
  AppRole,
  AuthContext,
  AuthServicePort,
  ProfileServicePort,
  UpdateOwnProfileInput,
} from './auth.types.js';

export class AuthService implements AuthServicePort {
  constructor(private readonly repository: AuthRepository) {}

  async authenticate(accessToken: string): Promise<AuthContext> {
    const user = await this.repository.verifyUser(accessToken);
    const profile = await this.repository.getProfile(accessToken, user.id);

    if (!profile.isActive) {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Akun Anda sedang tidak aktif.');
    }

    const member = await this.repository.getMember(accessToken, user.id);
    return {
      accessToken,
      user: { id: user.id, email: user.email ?? null },
      profile,
      member,
    };
  }

  async logout(accessToken: string): Promise<void> {
    await this.repository.logout(accessToken);
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

  async updateOwnProfile(
    context: AuthContext,
    input: UpdateOwnProfileInput,
  ): Promise<AppProfile> {
    return this.repository.updateOwnProfile(context, input);
  }

  async setRole(context: AuthContext, userId: string, role: AppRole): Promise<void> {
    await this.repository.setRole(context.accessToken, userId, role);
  }

  async setActive(
    context: AuthContext,
    userId: string,
    isActive: boolean,
  ): Promise<AppProfile> {
    return this.repository.setActive(context.accessToken, userId, isActive);
  }

  async linkMember(context: AuthContext, userId: string, memberId: string): Promise<void> {
    await this.repository.linkMember(context.accessToken, userId, memberId);
  }
}
