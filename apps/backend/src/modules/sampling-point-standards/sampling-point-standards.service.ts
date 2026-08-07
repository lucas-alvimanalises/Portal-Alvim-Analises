import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertSamplingPointStandardData {
  name: string;
}

// Lookup simples (mesmo padrão de ServiceTypesService): tipos de ponto de
// amostragem comparáveis entre empresas (ex.: "1ª Barreira (ANP)").
@Injectable()
export class SamplingPointStandardsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.samplingPointStandard.findMany({ orderBy: { name: 'asc' } });
  }

  async create(data: UpsertSamplingPointStandardData) {
    const existing = await this.prisma.samplingPointStandard.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Já existe um tipo padrão com este nome.');
    }
    return this.prisma.samplingPointStandard.create({ data });
  }

  async update(id: string, data: Partial<UpsertSamplingPointStandardData> & { active?: boolean }) {
    const existing = await this.prisma.samplingPointStandard.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tipo padrão não encontrado.');
    }
    return this.prisma.samplingPointStandard.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.samplingPointStandard.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tipo padrão não encontrado.');
    }
    return this.prisma.samplingPointStandard.update({ where: { id }, data: { active: false } });
  }
}
