export interface ServiceTypeDto {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface ContractScopeDto {
  id: string;
  serviceType: ServiceTypeDto;
}

export interface ContractDto {
  id: string;
  clientId: string;
  // Aninhado (não achatado em clientName) — mesmo padrão de `scopes` abaixo,
  // já que o backend não tem um mapper próprio pra este DTO (devolve o
  // resultado do Prisma direto, com o mesmo `include`).
  client: { companyName: string };
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  periodicity: string | null;
  active: boolean;
  scopes: ContractScopeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractPayload {
  clientId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  periodicity?: string;
  serviceTypeIds?: string[];
}

export type UpdateContractPayload = Partial<Omit<CreateContractPayload, 'clientId' | 'serviceTypeIds'>> & {
  active?: boolean;
};
