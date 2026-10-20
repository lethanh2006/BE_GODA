import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '../../database/enums.js';
import type { AuthUser } from './auth-user.js';

export const AUTH_REQUIRED_KEY = 'auth:required';
export const ROLES_KEY = 'auth:roles';

/** Bắt buộc đăng nhập. Không gắn decorator này thì route cho phép khách (user = undefined). */
export const Authenticated = () => SetMetadata(AUTH_REQUIRED_KEY, true);

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<Request>().user,
);
