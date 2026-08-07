import { Injectable } from '@nestjs/common';
import { AnpReportParameter, AnpRegulatoryLimitDto, UpdateAnpRegulatoryLimitsPayload } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';

// CRUD bem pequeno (3 linhas fixas, uma por parâmetro) — tabela de
// configuração dedicada, editável só por Admin/Gestor (ver controller),
// pra nunca precisar mexer em código/seed pra ajustar um limite da ANP.
@Injectable()
export class AnpRegulatoryLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AnpRegulatoryLimitDto[]> {
    const limits = await this.prisma.anpRegulatoryLimit.findMany({
      include: { updatedBy: { select: { name: true } } },
      orderBy: { parameter: 'asc' },
    });
    return limits.map((limit) => ({
      parameter: limit.parameter as AnpReportParameter,
      label: limit.label,
      regulatoryLimit: limit.regulatoryLimit,
      unit: limit.unit,
      updatedAt: limit.updatedAt.toISOString(),
      updatedByName: limit.updatedBy?.name ?? null,
    }));
  }

  async update(payload: UpdateAnpRegulatoryLimitsPayload, userId: string): Promise<AnpRegulatoryLimitDto[]> {
    await this.prisma.$transaction(
      payload.map((item) =>
        this.prisma.anpRegulatoryLimit.update({
          where: { parameter: item.parameter },
          data: { regulatoryLimit: item.regulatoryLimit, unit: item.unit, updatedById: userId },
        }),
      ),
    );
    return this.list();
  }
}
