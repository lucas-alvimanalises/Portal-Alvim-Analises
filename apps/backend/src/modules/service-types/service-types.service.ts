import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertServiceTypeData {
  name: string;
  description?: string;
}

// Lookup simples e sem regra de negócio complexa — não segue a separação em
// domain/application/infrastructure usada nos módulos CRUD "core" (decisão
// documentada em ARCHITECTURE.md).
@Injectable()
export class ServiceTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.serviceType.findMany({ orderBy: { name: 'asc' } });
  }

  async create(data: UpsertServiceTypeData) {
    const existing = await this.prisma.serviceType.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new ConflictException('Já existe um tipo de serviço com este nome.');
    }
    return this.prisma.serviceType.create({ data });
  }

  async update(id: string, data: Partial<UpsertServiceTypeData> & { active?: boolean }) {
    const existing = await this.prisma.serviceType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tipo de serviço não encontrado.');
    }
    return this.prisma.serviceType.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.serviceType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tipo de serviço não encontrado.');
    }
    return this.prisma.serviceType.update({ where: { id }, data: { active: false } });
  }
}
