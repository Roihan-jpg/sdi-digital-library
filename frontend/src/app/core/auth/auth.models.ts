export const appRoles = ['master_admin', 'head_librarian', 'librarian', 'member', 'guest'] as const;

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

export interface CurrentAuthContext {
  user: AuthUser;
  profile: AppProfile;
  member: MemberSummary | null;
}

export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';

export function roleHomePath(role: AppRole): string {
  switch (role) {
    case 'master_admin':
      return '/dashboard/admin';
    case 'head_librarian':
      return '/dashboard/monitoring';
    case 'librarian':
      return '/dashboard/operasional';
    case 'member':
      return '/dashboard/member';
    case 'guest':
      return '/katalog';
  }
}
