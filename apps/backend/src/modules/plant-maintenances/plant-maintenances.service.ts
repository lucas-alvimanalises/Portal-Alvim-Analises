import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  MAINTENANCE_BLOCKING_STATUSES,
  MaintenanceConflictDto,
  MaintenanceNature,
  MaintenanceStatus,
  PlantMaintenanceDto,
  Role,
} from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertOwnership } from '../../common/utils/scope.util';
import { fixMultipartFilename } from '../../common/utils/multipart-filename.util';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../attachments/domain/file-storage.interface';
import { CreatePlantMaintenanceDto } from './dto/create-plant-maintenance.dto';
import { UpdatePlantMaintenanceDto } from './dto/update-plant-maintenance.dto';
import { toPlantMaintenanceDto } from './plant-maintenance.mapper';

export interface PlantMaintenanceFilters {
  year?: number;
  month?: number;
  type?: string;
  status?: MaintenanceStatus;
}

const INCLUDE = {
  client: { select: { companyName: true } },
  createdBy: { select: { name: true } },
  attachments: { include: { uploadedBy: { select: { name: true } } } },
};

// Histórico de manutenções que o próprio cliente faz na planta — ver
// ARCHITECTURE.md futuro (cruzamento com resultados analíticos, fase 2).
// Cliente só mexe nas próprias empresas (mesmo `assertOwnership` já usado em
// service-executions/custody-extractions); ADMIN/MANAGER sem restrição.
@Injectable()
export class PlantMaintenancesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async findByClient(
    clientId: string,
    filters: PlantMaintenanceFilters,
    user: AuthenticatedUser,
  ): Promise<PlantMaintenanceDto[]> {
    assertOwnership(user, { clientId });

    const where: Record<string, unknown> = { clientId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.types = { has: filters.type };
    if (filters.year) {
      const monthStart = filters.month ? filters.month - 1 : 0;
      const monthEnd = filters.month ? filters.month - 1 : 11;
      where.date = {
        gte: new Date(Date.UTC(filters.year, monthStart, 1)),
        lt: new Date(Date.UTC(filters.year, monthEnd + 1, 1)),
      };
    }

    const rows = await this.prisma.plantMaintenance.findMany({
      where,
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
    return rows.map(toPlantMaintenanceDto);
  }

  async get(id: string, user: AuthenticatedUser): Promise<PlantMaintenanceDto> {
    const row = await this.prisma.plantMaintenance.findUnique({ where: { id }, include: INCLUDE });
    if (!row) {
      throw new NotFoundException('Manutenção não encontrada.');
    }
    assertOwnership(user, { clientId: row.clientId });
    return toPlantMaintenanceDto(row);
  }

  async create(dto: CreatePlantMaintenanceDto, user: AuthenticatedUser): Promise<PlantMaintenanceDto> {
    assertOwnership(user, { clientId: dto.clientId });

    const row = await this.prisma.plantMaintenance.create({
      data: {
        clientId: dto.clientId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: dto.status ?? MaintenanceStatus.SCHEDULED,
        nature: dto.nature,
        types: dto.types,
        otherType: dto.otherType,
        objectives: dto.objectives,
        otherObjective: dto.otherObjective,
        description: dto.description,
        createdById: user.id,
      },
      include: INCLUDE,
    });
    return toPlantMaintenanceDto(row);
  }

  // Cliente só edita/exclui manutenções que ainda não foram concluídas nem
  // canceladas — ADMIN/MANAGER podem sempre (ver assertOwnership acima pra
  // restrição por empresa, esta é a restrição por status).
  private assertClientCanModify(user: AuthenticatedUser, status: string): void {
    if (
      user.role === Role.CLIENT &&
      (status === MaintenanceStatus.COMPLETED || status === MaintenanceStatus.CANCELLED)
    ) {
      throw new ForbiddenException(
        'Não é possível editar ou excluir uma manutenção já concluída/cancelada.',
      );
    }
  }

  async update(
    id: string,
    dto: UpdatePlantMaintenanceDto,
    user: AuthenticatedUser,
  ): Promise<PlantMaintenanceDto> {
    const existing = await this.prisma.plantMaintenance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Manutenção não encontrada.');
    }
    assertOwnership(user, { clientId: existing.clientId });
    this.assertClientCanModify(user, existing.status);

    const row = await this.prisma.plantMaintenance.update({
      where: { id },
      data: {
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.nature !== undefined ? { nature: dto.nature } : {}),
        ...(dto.types !== undefined ? { types: dto.types } : {}),
        ...(dto.otherType !== undefined ? { otherType: dto.otherType } : {}),
        ...(dto.objectives !== undefined ? { objectives: dto.objectives } : {}),
        ...(dto.otherObjective !== undefined ? { otherObjective: dto.otherObjective } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
      include: INCLUDE,
    });
    return toPlantMaintenanceDto(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ success: true }> {
    const existing = await this.prisma.plantMaintenance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Manutenção não encontrada.');
    }
    assertOwnership(user, { clientId: existing.clientId });
    this.assertClientCanModify(user, existing.status);

    await this.prisma.plantMaintenance.delete({ where: { id } });
    return { success: true };
  }

  async uploadAttachment(
    id: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ): Promise<PlantMaintenanceDto> {
    const existing = await this.prisma.plantMaintenance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Manutenção não encontrada.');
    }
    assertOwnership(user, { clientId: existing.clientId });
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    await this.prisma.attachment.create({
      data: {
        kind: 'ATTACHMENT_FILE',
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
        plantMaintenanceId: id,
      },
    });

    return this.get(id, user);
  }

  async removeAttachment(attachmentId: string, user: AuthenticatedUser): Promise<{ success: true }> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { plantMaintenance: true },
    });
    if (!attachment?.plantMaintenance) {
      throw new NotFoundException('Anexo não encontrado.');
    }
    assertOwnership(user, { clientId: attachment.plantMaintenance.clientId });

    await this.fileStorageService.delete(attachment.storageKey);
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { success: true };
  }

  async downloadAttachment(attachmentId: string, user: AuthenticatedUser) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { plantMaintenance: true },
    });
    if (!attachment?.plantMaintenance) {
      throw new NotFoundException('Anexo não encontrado.');
    }
    assertOwnership(user, { clientId: attachment.plantMaintenance.clientId });

    const stream = await this.fileStorageService.getStream(attachment.storageKey);
    return { stream, filename: attachment.filename, mimeType: attachment.mimeType };
  }

  // Usado pelo ScheduleForm antes de submeter (aviso) e pelo
  // CreateScheduleUseCase/UpdateScheduleUseCase (guarda de verdade) — ver
  // MAINTENANCE_BLOCKING_STATUSES: só manutenção programada/em andamento
  // bloqueia, concluída/cancelada não impede mais nada.
  async checkConflicts(
    clientId: string,
    startDate: string,
    endDate?: string,
  ): Promise<MaintenanceConflictDto[]> {
    const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`);
    const end = endDate ? new Date(`${endDate.slice(0, 10)}T00:00:00Z`) : start;

    const rows = await this.prisma.plantMaintenance.findMany({
      where: {
        clientId,
        status: { in: MAINTENANCE_BLOCKING_STATUSES },
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      date: row.date.toISOString(),
      nature: row.nature as MaintenanceNature,
      types: row.types,
      description: row.description,
    }));
  }
}
