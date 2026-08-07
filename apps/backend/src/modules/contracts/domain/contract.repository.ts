import { Contract, ContractScope, ServiceType } from '@prisma/client';

export interface CreateContractData {
  clientId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  periodicity?: string;
  serviceTypeIds?: string[];
}

export type UpdateContractData = Partial<
  Omit<CreateContractData, 'clientId' | 'serviceTypeIds'>
> & { active?: boolean };

export type ContractWithScopes = Contract & {
  scopes: (ContractScope & { serviceType: ServiceType })[];
  client: { companyName: string };
};

export const CONTRACT_REPOSITORY = Symbol('CONTRACT_REPOSITORY');

export interface ContractRepository {
  findById(id: string): Promise<ContractWithScopes | null>;
  findMany(where?: Record<string, unknown>): Promise<ContractWithScopes[]>;
  create(data: CreateContractData): Promise<ContractWithScopes>;
  update(id: string, data: UpdateContractData): Promise<ContractWithScopes>;
  deactivate(id: string): Promise<ContractWithScopes>;
  addScope(contractId: string, serviceTypeId: string): Promise<ContractScope>;
  removeScope(contractId: string, serviceTypeId: string): Promise<void>;
}
