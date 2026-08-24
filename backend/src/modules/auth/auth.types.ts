export const appRoles = ['master_admin', 'head_librarian', 'librarian', 'member', 'guest'] as const;

export type AppRole = (typeof appRoles)[number];

export interface AuthUser {
  id: string;
  email: string | null;
}

export type AuthSource = 'supabase' | 'local';

export interface AppProfile {
  id: string;
  role: AppRole;
  fullName: string | null;
  avatarPath: string | null;
  isActive: boolean;
}

export interface ManagedProfile extends AppProfile {
  email: string | null;
  username: string | null;
  authSource: AuthSource;
  createdAt: string;
  lastSignInAt: string | null;
  invitedAt: string | null;
  member: Pick<MemberSummary, 'id' | 'memberCode' | 'fullName'> | null;
}

export interface ProfileListFilters {
  page: number;
  limit: number;
  search?: string | undefined;
  role?: AppRole | undefined;
  isActive?: boolean | undefined;
}

export interface MemberLinkCandidate {
  id: string;
  memberCode: string;
  fullName: string;
  isStudent: boolean;
}

export interface MemberLinkCandidateFilters {
  page: number;
  limit: number;
  search: string;
}

interface CreateAccountBase {
  username: string;
  fullName: string;
  role: AppRole;
  password: string;
}

export type CreateAccountInput = CreateAccountBase;

export interface UpdateAccountInput {
  username?: string | undefined;
  fullName?: string | undefined;
  role?: Exclude<AppRole, 'master_admin'> | undefined;
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
  authSource?: AuthSource;
  authUserId?: string;
}

export interface LocalLoginResult {
  accessToken: string;
  expiresAt: string;
  context: AuthContext;
}

export interface AuthServicePort {
  authenticate(accessToken: string): Promise<AuthContext>;
  logout(accessToken: string): Promise<void>;
  changePassword?(context: AuthContext, password: string): Promise<void>;
  loginLocal?(identifier: string, password: string): Promise<LocalLoginResult>;
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
  listMemberLinkCandidates?(
    context: AuthContext,
    filters: MemberLinkCandidateFilters,
  ): Promise<{ items: MemberLinkCandidate[]; total: number }>;
  listManagedProfiles?(
    context: AuthContext,
    filters: ProfileListFilters,
  ): Promise<{ items: ManagedProfile[]; total: number; page: number; limit: number }>;
  createAccount?(
    context: AuthContext,
    input: CreateAccountInput,
  ): Promise<ManagedProfile | AppProfile>;
  updateAccount?(
    context: AuthContext,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<AppProfile>;
  deleteAccount?(context: AuthContext, userId: string): Promise<void>;
  updatePassword?(context: AuthContext, userId: string, password: string): Promise<void>;
}
