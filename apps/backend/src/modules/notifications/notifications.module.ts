import { Module } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository';
import { PrismaNotificationRepository } from './infrastructure/prisma-notification.repository';

@Module({
  providers: [{ provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository }],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationsModule {}
