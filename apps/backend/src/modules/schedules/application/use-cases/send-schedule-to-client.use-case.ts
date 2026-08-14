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

    // Técnico(s) responsável(is) por ESTE agendamento — findEmailRecipientsForInternalStaff()
    // só cobre ADMIN/MANAGER, então sem isso o técnico alocado nunca era
    // avisado do serviço (pedido do usuário). Já vem carregado em
    // schedule.technicians (ver ScheduleWithRelations); mesmo respeito à
    // preferência de notificação e a contas desativadas que os outros grupos.
    const technicianEmails = (schedule.technicians ?? [])
      .map((t) => t.technician)
      .filter((technician) => technician.active && technician.emailNotifications)
      .map((technician) => technician.email);

    // Dedupe por e-mail (papéis diferentes não deveriam colidir, mas evita
    // envio duplicado se algum endereço aparecer em mais de um grupo).
    const allRecipients = [...clientRecipients, ...internalRecipients];
    const recipientEmails = Array.from(
      new Set([...allRecipients.map((r) => r.email), ...technicianEmails]),
    );

    if (recipientEmails.length === 0) {
      throw new BadRequestException(
        'Nenhum destinatário está cadastrado para receber notificações por e-mail. ' +
          'Verifique se há usuários com papel Cliente vinculados a esta empresa, Administrador/Gestor, ' +
          'ou técnico responsável alocado no agendamento, com a opção de e-mail ativada.',
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
