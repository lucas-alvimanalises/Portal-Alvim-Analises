import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientRepository, CreateClientData, UpdateClientData } from '../domain/client.repository';

@Injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }

  findByCnpj(cnpj: string) {
    return this.prisma.client.findUnique({ where: { cnpj } });
  }

  findMany() {
    return this.prisma.client.findMany({ orderBy: { companyName: 'asc' } });
  }

  findManyByIds(ids: string[]) {
    return this.prisma.client.findMany({
      where: { id: { in: ids } },
      orderBy: { companyName: 'asc' },
    });
  }

  create(data: CreateClientData) {
    return this.prisma.client.create({ data });
  }

  update(id: string, data: UpdateClientData) {
    return this.prisma.client.update({ where: { id }, data });
  }

  deactivate(id: string) {
    return this.prisma.client.update({ where: { id }, data: { status: 'INACTIVE' } });
  }
}
