import { Client } from '@prisma/client';
import { ClientStatus } from '@portal-alvim/shared';

export interface CreateClientData {
  companyName: string;
  cnpj: string;
  address?: string;
  city?: string;
  state?: string;
  mapsUrl?: string;
  mainContact?: string;
  email?: string;
  phone?: string;
}

export type UpdateClientData = Partial<CreateClientData> & { status?: ClientStatus };

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
  findByCnpj(cnpj: string): Promise<Client | null>;
  findMany(): Promise<Client[]>;
  findManyByIds(ids: string[]): Promise<Client[]>;
  create(data: CreateClientData): Promise<Client>;
  update(id: string, data: UpdateClientData): Promise<Client>;
  deactivate(id: string): Promise<Client>;
}
