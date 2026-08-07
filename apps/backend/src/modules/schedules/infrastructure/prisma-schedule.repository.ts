import { Injectable } from '@nestjs/common';
import { ScheduleStatus } from '@portal-alvim/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateScheduleData,
  ScheduleRepository,
  ScheduleSamplingPointInput,
  UpdateScheduleCommentsData,
  UpdateScheduleData,
} from '../domain/schedule.repository';

const INCLUDE_RELATIONS = {
  client: { select: { companyName: true } },
  serviceType: { select: { name: true } },
  technicians: { include: { technician: { select: { id: true, name: true } } } },
  samplingPoints: {
    include: {
      samplingPoint: { select: { id: true, name: true } },
      compounds: {
        include: { compound: { select: { id: true, code: true, name: true } } },
      },
    },
  },
};

function buildSamplingPointsCreate(points: ScheduleSamplingPointInput[]) {
  return points.map((point) => ({
    samplingPointId: point.samplingPointId,
    compounds: {
      create: point.compounds.map(({ compoundId, quantity }) => ({ compoundId, quantity })),
    },
  }));
}

@Injectable()
export class PrismaScheduleRepository implements ScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.schedule.findUnique({ where: { id }, include: INCLUDE_RELATIONS });
  }

  findMany(where: Record<string, unknown> = {}) {
    return this.prisma.schedule.findMany({
      where,
      include: INCLUDE_RELATIONS,
      orderBy: { scheduledDate: 'asc' },
    });
  }

  create(data: CreateScheduleData) {
    const { samplingPoints, technicianIds, ...scheduleData } = data;
    return this.prisma.schedule.create({
      data: {
        ...scheduleData,
        technicians: { create: technicianIds.map((technicianId) => ({ technicianId })) },
        samplingPoints: samplingPoints?.length
          ? { create: buildSamplingPointsCreate(samplingPoints) }
          : undefined,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  update(id: string, data: UpdateScheduleData) {
    const { samplingPoints, technicianIds, ...scheduleData } = data;

    // samplingPoints e technicianIds substituem o conjunto inteiro (não é um
    // "adicionar"); apagar e recriar dentro de uma transação evita estado
    // parcial. Os vínculos de composto caem junto via onDelete: Cascade.
    if (samplingPoints !== undefined || technicianIds !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        if (samplingPoints !== undefined) {
          await tx.scheduleSamplingPoint.deleteMany({ where: { scheduleId: id } });
        }
        if (technicianIds !== undefined) {
          await tx.scheduleTechnician.deleteMany({ where: { scheduleId: id } });
        }
        return tx.schedule.update({
          where: { id },
          data: {
            ...scheduleData,
            samplingPoints: samplingPoints?.length
              ? { create: buildSamplingPointsCreate(samplingPoints) }
              : undefined,
            technicians: technicianIds?.length
              ? { create: technicianIds.map((technicianId) => ({ technicianId })) }
              : undefined,
          },
          include: INCLUDE_RELATIONS,
        });
      });
    }

    return this.prisma.schedule.update({
      where: { id },
      data: scheduleData,
      include: INCLUDE_RELATIONS,
    });
  }

  updateComments(id: string, data: UpdateScheduleCommentsData) {
    return this.prisma.schedule.update({
      where: { id },
      data,
      include: INCLUDE_RELATIONS,
    });
  }

  updateStatus(id: string, status: ScheduleStatus) {
    return this.prisma.schedule.update({
      where: { id },
      data: { status },
      include: INCLUDE_RELATIONS,
    });
  }

  async delete(id: string) {
    await this.prisma.schedule.delete({ where: { id } });
  }
}
