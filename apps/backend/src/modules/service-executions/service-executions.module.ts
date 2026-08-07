import { Module } from '@nestjs/common';
import { SchedulesModule } from '../schedules/schedules.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { SERVICE_EXECUTION_REPOSITORY } from './domain/service-execution.repository';
import { PrismaServiceExecutionRepository } from './infrastructure/prisma-service-execution.repository';
import { ServiceExecutionsController } from './infrastructure/service-executions.controller';
import { UploadServicePhotoUseCase } from './application/use-cases/upload-service-photo.use-case';
import { ListServicePhotosUseCase } from './application/use-cases/list-service-photos.use-case';
import { DeleteServicePhotoUseCase } from './application/use-cases/delete-service-photo.use-case';
import { GetServicePhotoFileUseCase } from './application/use-cases/get-service-photo-file.use-case';

@Module({
  imports: [SchedulesModule, AttachmentsModule],
  controllers: [ServiceExecutionsController],
  providers: [
    { provide: SERVICE_EXECUTION_REPOSITORY, useClass: PrismaServiceExecutionRepository },
    UploadServicePhotoUseCase,
    ListServicePhotosUseCase,
    DeleteServicePhotoUseCase,
    GetServicePhotoFileUseCase,
  ],
  exports: [SERVICE_EXECUTION_REPOSITORY],
})
export class ServiceExecutionsModule {}
