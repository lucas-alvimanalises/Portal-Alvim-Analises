import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertCompoundData {
  code: string;
  name: string;
}

// Lookup simples (mesmo padrão de ServiceTypesService): compostos analisáveis
// (11000 - Siloxanos, 12000 - VOCs, ...).
@Injectable()
export class CompoundsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.compound.findMany({ orderBy: { code: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.compound.findUnique({ where: { id } });
  }

  async create(data: UpsertCompoundData) {
    const existing = await this.prisma.compound.findFirst({
      where: { OR: [{ code: data.code }, { name: data.name }] },
    });
    if (existing) {
      throw new ConflictException('Já existe um composto com este código ou nome.');
    }
    return this.prisma.compound.create({ data });
  }

  async update(id: string, data: Partial<UpsertCompoundData> & { active?: boolean }) {
    const existing = await this.prisma.compound.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Composto não encontrado.');
    }
    return this.prisma.compound.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.compound.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Composto não encontrado.');
    }
    return this.prisma.compound.update({ where: { id }, data: { active: false } });
  }
}
