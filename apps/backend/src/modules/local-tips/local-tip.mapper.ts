import { LocalTipCategory, LocalTipDto } from '@portal-alvim/shared';

type LocalTipWithRelations = {
  id: string;
  clientId: string;
  client: { companyName: string };
  name: string;
  category: string;
  address: string | null;
  mapsUrl: string | null;
  notes: string | null;
  createdById: string;
  createdBy: { name: string };
  createdAt: Date;
  updatedAt: Date;
};

export function toLocalTipDto(tip: LocalTipWithRelations): LocalTipDto {
  return {
    id: tip.id,
    clientId: tip.clientId,
    clientName: tip.client.companyName,
    name: tip.name,
    category: tip.category as LocalTipCategory,
    address: tip.address,
    mapsUrl: tip.mapsUrl,
    notes: tip.notes,
    createdById: tip.createdById,
    createdByName: tip.createdBy.name,
    createdAt: tip.createdAt.toISOString(),
    updatedAt: tip.updatedAt.toISOString(),
  };
}
