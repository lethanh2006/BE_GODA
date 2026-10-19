import type { UserRole } from '../../generated/prisma/enums.js';

export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

export const AUTH_COOKIE = 'goda_token';
