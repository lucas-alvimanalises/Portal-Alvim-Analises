import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ContractRepository,
  CreateContractData,
  UpdateContractData,
} from '../domain/contract.repository';

const INCLUDE_SCOPES = {
  scopes: { include: { serviceType: true } },
  client: { select: { companyName: true } },
};

@Injectable()
export class PrismaContractRepository implements ContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.contract.findUnique({ where: { id }, include: INCLUDE_SCOPES });
  }

  findMany(where: Record<string, unknown> = {}) {
    return this.prisma.contract.findMany({
      where,
      include: INCLUDE_SCOPES,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateContractData) {
    const { serviceTypeIds, ...contractData } = data;
    const contract = await this.prisma.contract.create({
      data: {
        ...contractData,
        scopes: serviceTypeIds
          ? { create: serviceTypeIds.map((serviceTypeId) => ({ serviceTypeId })) }
          : undefined,
      },
      include: INCLUDE_SCOPES,
    });
    return contract;
  }

  update(id: string, data: UpdateContractData) {
    return this.prisma.contract.update({ where: { id }, data, include: INCLUDE_SCOPES });
  }

  deactivate(id: string) {
    return this.prisma.contract.update({
      where: { id },
      data: { active: false },
      include: INCLUDE_SCOPES,
    });
  }

  addScope(contractId: string, serviceTypeId: string) {
    return this.prisma.contractScope.create({ data: { contractId, serviceTypeId } });
  }

  async removeScope(contractId: string, serviceTypeId: string) {
    await this.prisma.contractScope.delete({
      where: { contractId_serviceTypeId: { contractId, serviceTypeId } },
    });
  }
}
