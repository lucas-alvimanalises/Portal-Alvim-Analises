import { TrackingShipmentStatus } from '../enums';

// Log de envios de amostras pelos Correios pro laboratório parceiro —
// entidade própria (não presa a um agendamento específico): um mesmo envio
// pode levar amostras de mais de um serviço, o colaborador só cadastra o
// código + uma descrição livre do que está mandando. "postedAt" é sempre o
// momento do cadastro (não editável) — é a "data da postagem".
export interface TrackingShipmentDto {
  id: string;
  trackingCode: string;
  description: string;
  status: TrackingShipmentStatus;
  postedAt: string;
  deliveredAt: string | null;
  createdById: string;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrackingShipmentPayload {
  trackingCode: string;
  description: string;
}
