import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TokenService } from '../../infrastructure/token.service';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti },
        data: { revoked: true },
      });
    } catch {
      // Token já inválido/expirado — logout é idempotente, não precisa falhar.
    }
  }
}
