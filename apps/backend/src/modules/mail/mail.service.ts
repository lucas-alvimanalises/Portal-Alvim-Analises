import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { AppConfig } from '../../config/configuration';

export interface SendMailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendMailOptions {
  to: string[];
  subject: string;
  html: string;
  attachments?: SendMailAttachment[];
  // Remetente específico do fluxo (ex.: "agendamentos@alvimanalises.com.br"
  // para Ordens de Serviço, "resultados@alvimanalises.com.br" para
  // certificados). Cai para `mail.fromEmail` (config) quando omitido.
  from?: string;
}

// Envio de e-mail via Resend. Sem RESEND_API_KEY configurada, `send()` falha
// com um erro claro (em vez de silenciosamente não enviar) — ver .env.example.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(configService: ConfigService) {
    const appConfig = configService.get<AppConfig>('app')!;
    this.fromEmail = appConfig.mail.fromEmail;
    this.resend = appConfig.mail.resendApiKey ? new Resend(appConfig.mail.resendApiKey) : null;
  }

  async send(options: SendMailOptions): Promise<void> {
    if (!this.resend) {
      throw new ServiceUnavailableException(
        'Envio de e-mail não configurado: defina RESEND_API_KEY no .env do backend.',
      );
    }

    const { error } = await this.resend.emails.send({
      from: options.from ?? this.fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      })),
    });

    if (error) {
      this.logger.error(`Falha ao enviar e-mail via Resend: ${error.message}`);
      throw new ServiceUnavailableException(`Falha ao enviar e-mail: ${error.message}`);
    }
  }
}
