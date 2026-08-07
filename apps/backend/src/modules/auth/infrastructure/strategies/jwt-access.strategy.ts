import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { AppConfig } from '../../../../config/configuration';

interface AccessTokenPayload {
  sub: string;
  name: string;
  email: string;
  role: AuthenticatedUser['role'];
  clientIds: string[];
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(configService: ConfigService) {
    const appConfig = configService.get<AppConfig>('app')!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwt.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      clientIds: payload.clientIds ?? [],
    };
  }
}
