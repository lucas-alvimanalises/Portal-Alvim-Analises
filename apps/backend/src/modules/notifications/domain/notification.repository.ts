import { Notification, Prisma } from '@prisma/client';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

// Notificações in-app (sino do app mobile / futuramente do portal web) —
// disparadas por eventos reais do sistema (ver NotificationsService.notify),
// sem envio de e-mail/push nesta fase (só dentro do próprio app).
export interface NotificationRepository {
  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification>;
  findManyByUser(userId: string, limit: number): Promise<Notification[]>;
  countUnreadByUser(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<void>;
}
