import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { AUTH_COOKIE, type AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.register(dto);
    this.setCookie(res, token);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto);
    this.setCookie(res, token);
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
  }

  @Get('me')
  @Authenticated()
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private setCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
      maxAge: this.config.get('JWT_EXPIRES_DAYS', { infer: true }) * DAY_MS,
    });
  }
}
