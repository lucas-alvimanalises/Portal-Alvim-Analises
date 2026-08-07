import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../../schedules/domain/schedule.repository';
import { fixMultipartFilename } from '../../../../common/utils/multipart-filename.util';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  SERVICE_EXECUTION_REPOSITORY,
  ServiceExecutionRepository,
} from '../../domain/service-execution.repository';

@Injectable()
export class UploadServicePhotoUseCase {
  constructor(
    @Inject(SERVICE_EXECUTION_REPOSITORY)
    private readonly serviceExecutionRepository: ServiceExecutionRepository,
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(scheduleId: string, file: Express.Multer.File, user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, { clientId: schedule.clientId });

    // Cria a "execução do serviço" sob demanda no primeiro upload — não
    // depende de um fluxo de checklist prévio.
    let execution = await this.serviceExecutionRepository.findByScheduleId(scheduleId);
    if (!execution) {
      execution = await this.serviceExecutionRepository.create({
        scheduleId,
        executionDate: schedule.scheduledDate,
        technicianId: user.id,
      });
    }

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    return this.serviceExecutionRepository.addPhoto(execution.id, {
      storageKey: uploaded.storageKey,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: uploaded.sizeBytes,
      uploadedById: user.id,
    });
  }
}
