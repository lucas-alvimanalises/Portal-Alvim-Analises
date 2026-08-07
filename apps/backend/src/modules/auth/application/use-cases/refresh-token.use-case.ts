import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthTokens } from '@portal-alvim/shared';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TokenService } from '../../infrastructure/token.service';
import { toAuthenticatedUser } from '../to-authenticated-user';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    if (
      !stored ||
      stored.revoked ||
      stored.tokenHash !== tokenHash ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inativo.');
    }

    // Rotação: revoga o token usado e emite um novo par.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const newRecord = await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: '', expiresAt: this.tokenService.getRefreshExpiresAt() },
    });
    const newRefreshToken = this.tokenService.signRefreshToken(user.id, newRecord.id);
    await this.prisma.refreshToken.update({
      where: { id: newRecord.id },
      data: { tokenHash: this.tokenService.hashRefreshToken(newRefreshToken) },
    });

    const clientLinks = await this.prisma.clientUser.findMany({
      where: { userId: user.id },
      select: { clientId: true },
    });
    const accessToken = this.tokenService.signAccessToken(
      toAuthenticatedUser(
        user,
        clientLinks.map((link) => link.clientId),
      ),
    );

    return { accessToken, refreshToken: newRefreshToken };
  }
}
