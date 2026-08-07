import { ClientStatus } from '../enums';

export interface ClientDto {
  id: string;
  companyName: string;
  cnpj: string;
  address: string | null;
  city: string | null;
  state: string | null;
  // Link do Google Maps do endereço — usado futuramente para o técnico
  // navegar até o cliente direto do app mobile.
  mapsUrl: string | null;
  mainContact: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientPayload {
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

export type UpdateClientPayload = Partial<CreateClientPayload> & { status?: ClientStatus };
