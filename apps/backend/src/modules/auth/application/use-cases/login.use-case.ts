import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginResponse } from '@portal-alvim/shared';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PasswordHasherService } from '../../infrastructure/password-hasher.service';
import { TokenService } from '../../infrastructure/token.service';
import { toAuthenticatedUser } from '../to-authenticated-user';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(email: string, password: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await this.passwordHasher.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const clientLinks = await this.prisma.clientUser.findMany({
      where: { userId: user.id },
      select: { clientId: true },
    });
    const authenticatedUser = toAuthenticatedUser(
      user,
      clientLinks.map((link) => link.clientId),
    );

    const accessToken = this.tokenService.signAccessToken(authenticatedUser);

    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: '',
        expiresAt: this.tokenService.getRefreshExpiresAt(),
      },
    });
    const refreshToken = this.tokenService.signRefreshToken(user.id, refreshTokenRecord.id);
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { tokenHash: this.tokenService.hashRefreshToken(refreshToken) },
    });

    return { accessToken, refreshToken, user: authenticatedUser };
  }
}
