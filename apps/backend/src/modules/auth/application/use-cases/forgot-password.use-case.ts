import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { AppConfig } from '../../../../config/configuration';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MailService } from '../../../mail/mail.service';
import { hashResetToken, RESET_TOKEN_TTL_MS } from '../../infrastructure/reset-token.util';

const PASSWORD_RESET_EMAIL_FROM = 'portal@alvimanalises.com.br';

// Rota pública (sem autenticação) — por isso NUNCA revela se o e-mail existe
// ou não: sempre "termina bem" do ponto de vista de quem chamou (ver
// AuthController), e só de fato gera/envia o token quando encontra um
// usuário ativo com aquele e-mail. Isso evita que alguém use este endpoint
// pra descobrir quais e-mails estão cadastrados no portal.
@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);

    // Só o pedido mais recente vale — evita que um link antigo esquecido
    // (ex.: num e-mail velho) continue funcionando depois de um novo pedido.
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    const appConfig = this.configService.get<AppConfig>('app')!;
    const resetUrl = `${appConfig.webAppUrl}/redefinir-senha?token=${rawToken}`;

    try {
      await this.mailService.send({
        from: PASSWORD_RESET_EMAIL_FROM,
        to: [user.email],
        subject: 'Redefinição de senha - Portal Alvim Análises',
        html: `
          <p>Olá, ${user.name},</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta no Portal Alvim Análises.</p>
          <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>. Este link expira em 1 hora.</p>
          <p>Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha continua a mesma.</p>
          <p>Atenciosamente,<br/>Alvim Análises</p>
        `,
      });
    } catch (error) {
      // Falha de envio não deve mudar a resposta pra quem chamou (ver
      // decisão de não revelar existência do e-mail acima) — só registra no
      // log do servidor. Logar a própria URL aqui é intencional: é o único
      // jeito de alguém da operação conseguir encaminhar o link manualmente
      // se o provedor de e-mail (Resend) estiver fora do ar ou mal configurado.
      this.logger.error(
        `Falha ao enviar e-mail de redefinição de senha para ${user.email}: ${error}. Link gerado: ${resetUrl}`,
      );
    }
  }
}
