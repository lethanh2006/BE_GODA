import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { User } from '../../database/entities/index.js';
import type { JwtPayload } from '../../common/auth/auth-user.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { hashPassword, verifyPassword } from './password.js';
import { GoogleOAuthService } from './google-oauth.service.js';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const driverError = 'driverError' in error ? error.driverError : error;
  return typeof driverError === 'object' && driverError !== null && 'code' in driverError && driverError.code === '23505';
}

export type PublicUser = Omit<User, 'passwordHash' | 'googleSub' | 'updatedAt'> & { googleConnected: boolean };

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    targetLevel: user.targetLevel,
    createdAt: user.createdAt,
    googleConnected: !!user.googleSub,
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly google: GoogleOAuthService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.existsBy({ email: dto.email })) {
      throw new ConflictException('Email này đã được đăng ký');
    }
    const user = await this.users.save(
      this.users.create({
        email: dto.email,
        displayName: dto.displayName,
        passwordHash: await hashPassword(dto.password),
      }),
    );
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user?.passwordHash || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.issue(user);
  }

  async loginWithGoogle(idToken: string) {
    const profile = await this.google.verifyIdToken(idToken);
    let user = await this.users.findOneBy({ googleSub: profile.sub });
    if (!user) {
      // Email accounts are not verified in GODA. Link only from an authenticated session.
      if (await this.users.existsBy({ email: profile.email })) {
        throw new ConflictException('Email này đã có tài khoản. Hãy đăng nhập bằng mật khẩu rồi liên kết Google trong Cài đặt.');
      }
      try {
        user = await this.users.save(this.users.create({
          email: profile.email,
          displayName: profile.name.slice(0, 50),
          passwordHash: null,
          googleSub: profile.sub,
        }));
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        user = await this.users.findOneBy({ googleSub: profile.sub });
        if (!user) throw new ConflictException('Email này đã có tài khoản. Hãy đăng nhập bằng mật khẩu rồi liên kết Google trong Cài đặt.');
      }
    }
    return this.issue(user);
  }

  async linkGoogle(userId: string, idToken: string): Promise<PublicUser> {
    const profile = await this.google.verifyIdToken(idToken);
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ');
    if (user.email !== profile.email) {
      throw new BadRequestException('Hãy chọn tài khoản Google có cùng email với tài khoản GODA');
    }
    if (user.googleSub === profile.sub) return toPublicUser(user);
    if (user.googleSub || await this.users.existsBy({ googleSub: profile.sub })) {
      throw new ConflictException('Tài khoản Google này đã được liên kết');
    }
    user.googleSub = profile.sub;
    try {
      return toPublicUser(await this.users.save(user));
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Tài khoản Google này đã được liên kết');
      throw error;
    }
  }

  async me(userId: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ');
    }
    return toPublicUser(user);
  }

  async findPublicUser(userId: string) {
    const user = await this.users.findOneBy({ id: userId });
    return user ? toPublicUser(user) : null;
  }

  private async issue(user: User) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { token, user: toPublicUser(user) };
  }
}
