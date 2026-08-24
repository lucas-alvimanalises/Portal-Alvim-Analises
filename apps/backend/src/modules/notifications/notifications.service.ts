import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from './domain/notification.repository';

const RECENT_LIMIT = 50;

// Ponto único de disparo — outros módulos chamam notify() quando um evento
// relevante acontece (ex.: técnico alocado num serviço, ver
// UpdateScheduleUseCase/CreateScheduleUseCase). Sem envio de e-mail/push
// nesta fase, só grava pra aparecer no sino do app na próxima consulta.
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepository: NotificationRepository,
  ) {}

  notify(userId: string, type: string, message: string, link?: string) {
    return this.notificationRepository.create({ userId, type, message, link });
  }

  listMine(userId: string) {
    return this.notificationRepository.findManyByUser(userId, RECENT_LIMIT);
  }

  countUnread(userId: string) {
    return this.notificationRepository.countUnreadByUser(userId);
  }

  markRead(id: string, userId: string) {
    return this.notificationRepository.markRead(id, userId);
  }

  markAllRead(userId: string) {
    return this.notificationRepository.markAllRead(userId);
  }
}
