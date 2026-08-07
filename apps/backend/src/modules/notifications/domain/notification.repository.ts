import { Notification, Prisma } from '@prisma/client';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

// Módulo stub (fase 1): estrutura pronta para o emissor de notificações
// futuro (novo agendamento, certificado disponível, etc.) — ver
// ARCHITECTURE.md. Sem disparo real (e-mail/push) nesta fase.
export interface NotificationRepository {
  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification>;
  findManyByUser(userId: string): Promise<Notification[]>;
}
