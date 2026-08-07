import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PasswordHasherService } from '../../infrastructure/password-hasher.service';
import { hashResetToken } from '../../infrastructure/reset-token.util';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashResetToken(token);
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!resetToken) {
      throw new BadRequestException('Link de redefinição inválido ou expirado. Solicite um novo.');
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoga todas as sessões ativas — se alguém mais tinha acesso à conta
      // (motivo mais comum de se pedir uma redefinição), o refresh token que
      // essa pessoa já tinha guardado não pode continuar valendo depois da
      // troca de senha.
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revoked: false },
        data: { revoked: true },
      }),
    ]);
  }
}
