import { BadRequestException, ConflictException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { User } from '../../database/entities/index.js';
import { UserRole } from '../../database/enums.js';
import { AuthService } from './auth.service.js';
import type { GoogleOAuthService } from './google-oauth.service.js';

const profile = { sub: 'google-123', email: 'hoc.vien@example.com', name: 'Học viên' };

function makeUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: '6bcfb80f-87d2-4aef-b5eb-144703fd0920',
    email: profile.email,
    displayName: profile.name,
    passwordHash: null,
    googleSub: profile.sub,
    role: UserRole.USER,
    targetLevel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }, overrides);
}

function setup() {
  const users = {
    findOneBy: vi.fn(),
    existsBy: vi.fn(),
    create: vi.fn((input: Partial<User>) => makeUser(input)),
    save: vi.fn(async (user: User) => user),
  };
  const jwt = { signAsync: vi.fn(async () => 'session-token') };
  const google = { verifyIdToken: vi.fn(async () => profile) };
  const service = new AuthService(
    users as unknown as Repository<User>,
    jwt as unknown as JwtService,
    google as unknown as GoogleOAuthService,
  );
  return { service, users, google };
}

describe('AuthService Google login', () => {
  it('creates a Google-only user and issues a normal session', async () => {
    const { service, users } = setup();
    users.findOneBy.mockResolvedValue(null);
    users.existsBy.mockResolvedValue(false);

    const result = await service.loginWithGoogle('id-token');

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({
      email: profile.email, passwordHash: null, googleSub: profile.sub,
    }));
    expect(result.token).toBe('session-token');
    expect(result.user.googleConnected).toBe(true);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('googleSub');
  });

  it('does not automatically link an existing password account by email', async () => {
    const { service, users } = setup();
    users.findOneBy.mockResolvedValue(null);
    users.existsBy.mockResolvedValue(true);

    await expect(service.loginWithGoogle('id-token')).rejects.toBeInstanceOf(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('uses the existing Google identity and rejects password login for Google-only users', async () => {
    const { service, users } = setup();
    users.findOneBy.mockResolvedValue(makeUser());

    const result = await service.loginWithGoogle('id-token');
    expect(result.user.email).toBe(profile.email);
    expect(users.save).not.toHaveBeenCalled();
    await expect(service.login({ email: profile.email, password: 'any-password' })).rejects.toThrow('Email hoặc mật khẩu không đúng');
  });

  it('links only a Google account with the signed-in user’s email', async () => {
    const { service, users } = setup();
    const user = makeUser({ googleSub: null, passwordHash: 'scrypt-hash' });
    users.findOneBy.mockResolvedValue(user);
    users.existsBy.mockResolvedValue(false);

    const linked = await service.linkGoogle(user.id, 'id-token');
    expect(linked.googleConnected).toBe(true);
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ googleSub: profile.sub }));

    users.findOneBy.mockResolvedValue(makeUser({ email: 'other@example.com', googleSub: null }));
    await expect(service.linkGoogle(user.id, 'id-token')).rejects.toBeInstanceOf(BadRequestException);
  });
});
