import { Role, ScheduleDerivedStatus, ScheduleDto } from '@portal-alvim/shared';
import { ScheduleWithRelations } from '../domain/schedule.repository';

// viewerRole determina o que a resposta pode conter — comentários internos
// (anotações de campo do técnico) nunca chegam a um usuário papel CLIENT,
// não importa o que esteja salvo no banco. derivedStatus vem sempre pronto
// de fora (ScheduleDerivedStatusService) — o mapper só empacota.
export function toScheduleDto(
  schedule: ScheduleWithRelations,
  viewerRole: Role | undefined,
  derivedStatus: ScheduleDerivedStatus,
): ScheduleDto {
  return {
    id: schedule.id,
    orderNumber: schedule.orderNumber,
    contractId: schedule.contractId,
    clientId: schedule.clientId,
    clientName: schedule.client?.companyName,
    serviceTypeId: schedule.serviceTypeId,
    serviceTypeName: schedule.serviceType?.name,
    scheduledDate: schedule.scheduledDate.toISOString(),
    endDate: schedule.endDate?.toISOString() ?? null,
    dateConfirmed: schedule.dateConfirmed,
    technicians: schedule.technicians?.map((t) => t.technician) ?? [],
    samplingPoints:
      schedule.samplingPoints?.map((sp) => ({
        samplingPointId: sp.samplingPoint.id,
        samplingPointName: sp.samplingPoint.name,
        compounds: sp.compounds.map((c) => ({ ...c.compound, quantity: c.quantity })),
      })) ?? [],
    status: schedule.status as ScheduleDto['status'],
    derivedStatus,
    internalComments: viewerRole === Role.CLIENT ? null : schedule.internalComments,
    clientComments: schedule.clientComments,
    clientResponse: schedule.clientResponse,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}
