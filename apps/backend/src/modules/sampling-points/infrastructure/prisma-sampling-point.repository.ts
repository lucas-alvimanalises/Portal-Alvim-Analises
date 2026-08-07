import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateSamplingPointData,
  SamplingPointRepository,
  UpdateSamplingPointData,
} from '../domain/sampling-point.repository';

const INCLUDE_STANDARD = { standard: { select: { name: true } } };

@Injectable()
export class PrismaSamplingPointRepository implements SamplingPointRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.samplingPoint.findUnique({ where: { id }, include: INCLUDE_STANDARD });
  }

  findManyByClient(clientId: string) {
    return this.prisma.samplingPoint.findMany({
      where: { clientId },
      include: INCLUDE_STANDARD,
      orderBy: { name: 'asc' },
    });
  }

  create(data: CreateSamplingPointData) {
    return this.prisma.samplingPoint.create({ data, include: INCLUDE_STANDARD });
  }

  update(id: string, data: UpdateSamplingPointData) {
    return this.prisma.samplingPoint.update({ where: { id }, data, include: INCLUDE_STANDARD });
  }

  deactivate(id: string) {
    return this.prisma.samplingPoint.update({
      where: { id },
      data: { active: false },
      include: INCLUDE_STANDARD,
    });
  }
}
