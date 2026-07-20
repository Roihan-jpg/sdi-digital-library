export const appRoles = [
  'master_admin',
  'head_librarian',
  'librarian',
  'member',
  'guest',
] as const;

export type AppRole = (typeof appRoles)[number];

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AppProfile {
  id: string;
  role: AppRole;
  fullName: string | null;
  avatarPath: string | null;
  isActive: boolean;
}

export interface MemberSummary {
  id: string;
  memberCode: string;
  cardNumber: string;
  fullName: string;
  isStudent: boolean;
  isActive: boolean;
}

export interface AuthContext {
  accessToken: string;
  user: AuthUser;
  profile: AppProfile;
  member: MemberSummary | null;
}

export interface AuthServicePort {
  authenticate(accessToken: string): Promise<AuthContext>;
  logout(accessToken: string): Promise<void>;
}

export interface UpdateOwnProfileInput {
  fullName?: string | null | undefined;
  avatarPath?: string | null | undefined;
}

export interface ProfileServicePort {
  listProfiles(
    context: AuthContext,
    page: number,
    limit: number,
  ): Promise<{ items: AppProfile[]; total: number; page: number; limit: number }>;
  getOwnContext(context: AuthContext): Promise<AuthContext>;
  updateOwnProfile(context: AuthContext, input: UpdateOwnProfileInput): Promise<AppProfile>;
  setRole(context: AuthContext, userId: string, role: AppRole): Promise<void>;
  setActive(context: AuthContext, userId: string, isActive: boolean): Promise<AppProfile>;
  linkMember(context: AuthContext, userId: string, memberId: string): Promise<void>;
}
