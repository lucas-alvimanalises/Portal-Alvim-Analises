import { LocalTipCategory } from '../enums';

// "Dicas locais" — lugares úteis perto de um cliente (onde comer, onde
// comprar insumo que só acha ali, etc.), cadastradas livremente por
// qualquer colaborador Alvim que já passou pela região. Uso 100% interno:
// nunca chega ao papel CLIENT (ver LocalTipsController, sem @Roles(CLIENT)).
export interface LocalTipDto {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  category: LocalTipCategory;
  address: string | null;
  mapsUrl: string | null;
  notes: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocalTipPayload {
  clientId: string;
  name: string;
  category: LocalTipCategory;
  address?: string;
  mapsUrl?: string;
  notes?: string;
}

export type UpdateLocalTipPayload = Partial<Omit<CreateLocalTipPayload, 'clientId'>>;
