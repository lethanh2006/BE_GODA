import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { User } from '../../database/entities/index.js';
import type { JwtPayload } from '../../common/auth/auth-user.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { hashPassword, verifyPassword } from './password.js';

export type PublicUser = Omit<User, 'passwordHash' | 'updatedAt'>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    targetLevel: user.targetLevel,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
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
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.issue(user);
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
