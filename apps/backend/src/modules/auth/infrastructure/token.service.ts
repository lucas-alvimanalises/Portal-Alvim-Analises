import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { AppConfig } from '../../../config/configuration';

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class TokenService {
  private readonly appConfig: AppConfig;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.appConfig = configService.get<AppConfig>('app')!;
  }

  signAccessToken(user: AuthenticatedUser): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientIds: user.clientIds,
      },
      {
        secret: this.appConfig.jwt.accessSecret,
        expiresIn: this.appConfig.jwt.accessExpiresIn,
      },
    );
  }

  signRefreshToken(userId: string, refreshTokenId: string): string {
    const payload: RefreshTokenPayload = { sub: userId, jti: refreshTokenId };
    return this.jwtService.sign(payload, {
      secret: this.appConfig.jwt.refreshSecret,
      expiresIn: this.appConfig.jwt.refreshExpiresIn,
    });
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.jwtService.verify<RefreshTokenPayload>(token, {
      secret: this.appConfig.jwt.refreshSecret,
    });
  }

  // Refresh tokens já são strings de alta entropia (JWT assinado), então um
  // hash rápido (SHA-256) é suficiente para comparação — não precisamos do
  // custo de bcrypt aqui, e evitamos seu limite de 72 bytes de entrada.
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshExpiresAt(): Date {
    const ms = this.parseDurationToMs(this.appConfig.jwt.refreshExpiresIn);
    return new Date(Date.now() + ms);
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
    return value * unitMs;
  }
}
