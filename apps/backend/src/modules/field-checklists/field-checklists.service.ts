import { NotFoundException, Injectable } from '@nestjs/common';
import { FieldChecklistDto } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';

// Check list de material de campo (ver FIELD_CHECKLIST_SECTIONS em
// @portal-alvim/shared pra lista fixa de itens) — um registro por
// agendamento, salvar de novo sobrescreve (o técnico reabre e corrige à
// vontade, não é um histórico de versões). quantities guarda só os itens
// com quantidade > 0 (ex.: "9 Impingers"), o resto fica implicitamente 0.
@Injectable()
export class FieldChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(scheduleId: string): Promise<FieldChecklistDto | null> {
    const checklist = await this.prisma.serviceChecklist.findUnique({
      where: { scheduleId },
      include: { filledBy: { select: { name: true } } },
    });
    if (!checklist) return null;
    return this.toDto(checklist);
  }

  async save(
    scheduleId: string,
    quantities: Record<string, number>,
    userId: string,
  ): Promise<FieldChecklistDto> {
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    // Só guarda quantidades positivas — 0/negativo/ausente é "não levou".
    const cleaned: Record<string, number> = {};
    Object.entries(quantities).forEach(([key, value]) => {
      if (Number.isFinite(value) && value > 0) cleaned[key] = Math.floor(value);
    });

    const checklist = await this.prisma.serviceChecklist.upsert({
      where: { scheduleId },
      update: { quantities: cleaned, filledById: userId, filledAt: new Date() },
      create: { scheduleId, quantities: cleaned, filledById: userId },
      include: { filledBy: { select: { name: true } } },
    });
    return this.toDto(checklist);
  }

  private toDto(checklist: {
    id: string;
    scheduleId: string;
    quantities: unknown;
    filledById: string;
    filledBy: { name: string };
    filledAt: Date;
    updatedAt: Date;
  }): FieldChecklistDto {
    return {
      id: checklist.id,
      scheduleId: checklist.scheduleId,
      quantities: (checklist.quantities as Record<string, number>) ?? {},
      filledById: checklist.filledById,
      filledByName: checklist.filledBy.name,
      filledAt: checklist.filledAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
    };
  }
}
