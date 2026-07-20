import type { AuthContext } from '../../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: AuthContext;
    }
  }
}

export {};
