import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import type { Repository } from 'typeorm';
import { User } from '../../database/entities/index.js';
import type { UserRole } from '../../database/enums.js';
import { AUTH_COOKIE, type JwtPayload } from './auth-user.js';
import { AUTH_REQUIRED_KEY, ROLES_KEY } from './decorators.js';

/**
 * Guard toàn cục: đọc JWT từ cookie hoặc header Authorization (nếu có) và gắn vào request.user.
 * Chỉ chặn request khi route có @Authenticated() hoặc @Roles().
 * Với @Roles(), quyền được đọc lại từ database để thay đổi quyền có hiệu lực ngay, không phụ thuộc token cũ.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token);
        // Token cấp trước khi đổi sang id UUID thì coi như chưa đăng nhập.
        request.user = isUUID(payload.sub) ? { id: payload.sub, role: payload.role } : undefined;
      } catch {
        request.user = undefined;
      }
    }

    const targets = [context.getHandler(), context.getClass()];
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, targets);
    const required =
      this.reflector.getAllAndOverride<boolean | undefined>(AUTH_REQUIRED_KEY, targets) ||
      !!roles?.length;

    if (required && !request.user) {
      throw new UnauthorizedException('Vui lòng đăng nhập');
    }
    if (roles?.length) {
      const current = await this.users.findOne({
        where: { id: request.user!.id },
        select: { id: true, role: true },
      });
      if (!current || !roles.includes(current.role)) {
        throw new ForbiddenException('Không có quyền truy cập');
      }
      request.user!.role = current.role;
    }
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[AUTH_COOKIE];
  }
}
