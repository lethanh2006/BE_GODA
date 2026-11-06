import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import type { EnvironmentVariables } from '../../config/env.validation.js';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    if (!clientId) throw new ServiceUnavailableException('Đăng nhập Google chưa được cấu hình');

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Đăng nhập Google chưa thành công, vui lòng thử lại');
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Tài khoản Google cần có email đã xác minh');
    }
    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: payload.name?.trim() || payload.email.split('@')[0],
    };
  }
}
