import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateSampleData,
  ResultRowData,
  SampleRepository,
  UpdateSampleData,
} from '../domain/sample.repository';

const INCLUDE_RELATIONS = {
  client: { select: { companyName: true } },
  schedule: { select: { scheduledDate: true } },
  samplingPoint: { select: { name: true } },
  compound: { select: { code: true, name: true } },
  responsibleUser: { select: { name: true } },
  resultRows: { orderBy: { order: 'asc' as const } },
};

@Injectable()
export class PrismaSampleRepository implements SampleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.sample.findUnique({ where: { id }, include: INCLUDE_RELATIONS });
  }

  findMany(where: Record<string, unknown> = {}) {
    return this.prisma.sample.findMany({
      where,
      include: INCLUDE_RELATIONS,
      orderBy: { collectionDate: 'desc' },
    });
  }

  create(data: CreateSampleData) {
    return this.prisma.sample.create({ data, include: INCLUDE_RELATIONS });
  }

  update(id: string, data: UpdateSampleData) {
    return this.prisma.sample.update({ where: { id }, data, include: INCLUDE_RELATIONS });
  }

  deactivate(id: string) {
    return this.prisma.sample.update({
      where: { id },
      data: { active: false },
      include: INCLUDE_RELATIONS,
    });
  }

  async replaceResultRows(sampleId: string, rows: ResultRowData[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.sampleResultRow.deleteMany({ where: { sampleId } });
      if (rows.length > 0) {
        await tx.sampleResultRow.createMany({
          data: rows.map((row) => ({ ...row, sampleId })),
        });
      }
      return tx.sample.findUniqueOrThrow({ where: { id: sampleId }, include: INCLUDE_RELATIONS });
    });
  }

  async findMostRecentScheduleIdWithSamples(clientId: string, excludingScheduleId: string) {
    const sample = await this.prisma.sample.findFirst({
      where: {
        clientId,
        active: true,
        scheduleId: { not: excludingScheduleId },
      },
      orderBy: { schedule: { scheduledDate: 'desc' } },
      select: { scheduleId: true },
    });
    return sample?.scheduleId ?? null;
  }

  async copyStructureToSchedule(
    sourceScheduleId: string,
    targetScheduleId: string,
    targetCollectionDate: Date,
  ) {
    const sourceSamples = await this.prisma.sample.findMany({
      where: { scheduleId: sourceScheduleId, active: true },
      include: { resultRows: { orderBy: { order: 'asc' } } },
    });

    return this.prisma.$transaction(
      sourceSamples.map((source) =>
        this.prisma.sample.create({
          data: {
            clientId: source.clientId,
            scheduleId: targetScheduleId,
            samplingPointId: source.samplingPointId,
            compoundId: source.compoundId,
            collectionDate: targetCollectionDate,
            analysisStatus: 'PENDING',
            resultRows: {
              create: source.resultRows.map((row) => ({
                parameterName: row.parameterName,
                unit: row.unit,
                specLimit: row.specLimit,
                order: row.order,
                result: '',
              })),
            },
          },
          include: INCLUDE_RELATIONS,
        }),
      ),
    );
  }
}
