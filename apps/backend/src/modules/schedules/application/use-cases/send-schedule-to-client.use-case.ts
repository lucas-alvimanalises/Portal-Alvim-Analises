import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/configuration';
import { CLIENT_REPOSITORY, ClientRepository } from '../../../clients/domain/client.repository';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/user.repository';
import { MailService } from '../../../mail/mail.service';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';
import { buildServiceOrderPdfBuffer } from '../schedule-pdf.util';

// Remetente específico deste fluxo — cada tipo de e-mail automático usa seu
// próprio endereço no domínio verificado (ex.: futuramente
// "resultados@alvimanalises.com.br" para o envio de certificados).
const SCHEDULE_EMAIL_FROM = 'agendamentos@alvimanalises.com.br';

@Injectable()
export class SendScheduleToClientUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(scheduleId: string): Promise<{ sentTo: string[] }> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    const client = await this.clientRepository.findById(schedule.clientId);
    if (!client) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const [clientRecipients, internalRecipients] = await Promise.all([
      this.userRepository.findEmailRecipientsForClient(schedule.clientId),
      this.userRepository.findEmailRecipientsForInternalStaff(),
    ]);

    // Dedupe por e-mail (papéis diferentes não deveriam colidir, mas evita
    // envio duplicado se algum endereço aparecer nos dois grupos).
    const recipientEmails = Array.from(
      new Set([...clientRecipients, ...internalRecipients].map((recipient) => recipient.email)),
    );

    if (recipientEmails.length === 0) {
      throw new BadRequestException(
        'Nenhum destinatário está cadastrado para receber notificações por e-mail. ' +
          'Verifique se há usuários com papel Cliente vinculados a esta empresa, ou Administrador/Gestor, com a opção de e-mail ativada.',
      );
    }

    const pdfBuffer = buildServiceOrderPdfBuffer(schedule, client);
    const referenceNumber = String(schedule.orderNumber).padStart(5, '0');
    const appConfig = this.configService.get<AppConfig>('app')!;
    const scheduleUrl = `${appConfig.webAppUrl}/agendamentos/${scheduleId}`;
    const scheduledDateLabel = schedule.scheduledDate.toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
    });

    await this.mailService.send({
      from: SCHEDULE_EMAIL_FROM,
      to: recipientEmails,
      subject: `Agendamento ${client.companyName} ${scheduledDateLabel} - Alvim Análises`,
      html: `
        <p>Olá,</p>
        <p>Segue em anexo a Ordem de Serviço Nº ${referenceNumber} referente ao agendamento de
        <strong>${schedule.serviceType?.name ?? 'serviço'}</strong> para <strong>${client.companyName}</strong>.</p>
        <p>Você também pode visualizar o agendamento diretamente no portal: <a href="${scheduleUrl}">${scheduleUrl}</a></p>
        <p>Atenciosamente,<br/>Alvim Análises</p>
      `,
      attachments: [
        { filename: `Ordem_de_Servico_${referenceNumber}.pdf`, content: pdfBuffer },
      ],
    });

    return { sentTo: recipientEmails };
  }
}
