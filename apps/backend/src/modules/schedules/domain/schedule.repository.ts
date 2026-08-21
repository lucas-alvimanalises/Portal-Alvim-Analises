import { Schedule } from '@prisma/client';
import { ScheduleStatus } from '@portal-alvim/shared';

export interface ScheduleSamplingPointCompoundInput {
  compoundId: string;
  quantity: number;
}

export interface ScheduleSamplingPointInput {
  samplingPointId: string;
  compounds: ScheduleSamplingPointCompoundInput[];
}

export interface CreateScheduleData {
  contractId?: string;
  clientId: string;
  serviceTypeId: string;
  scheduledDate: Date;
  endDate?: Date;
  dateConfirmed?: boolean;
  technicianIds: string[];
  samplingPoints?: ScheduleSamplingPointInput[];
}

export type UpdateScheduleData = Partial<CreateScheduleData>;

export interface UpdateScheduleCommentsData {
  internalComments?: string;
  clientComments?: string;
  clientResponse?: string;
  trackingCode?: string;
}

export type ScheduleWithRelations = Schedule & {
  client?: { companyName: string } | null;
  serviceType?: { name: string } | null;
  // email/active/emailNotifications só existem aqui pro envio de e-mail ao
  // técnico responsável (ver SendScheduleToClientUseCase) — nunca vazam pro
  // DTO público (schedule.mapper.ts mapeia campo a campo, não espalha o
  // objeto inteiro, de propósito).
  technicians?: {
    technician: { id: string; name: string; email: string; active: boolean; emailNotifications: boolean };
  }[];
  samplingPoints?: {
    samplingPoint: { id: string; name: string };
    compounds: { quantity: number; compound: { id: string; code: string; name: string } }[];
  }[];
};

export const SCHEDULE_REPOSITORY = Symbol('SCHEDULE_REPOSITORY');

export interface ScheduleRepository {
  findById(id: string): Promise<ScheduleWithRelations | null>;
  findMany(where?: Record<string, unknown>): Promise<ScheduleWithRelations[]>;
  create(data: CreateScheduleData): Promise<ScheduleWithRelations>;
  update(id: string, data: UpdateScheduleData): Promise<ScheduleWithRelations>;
  updateComments(id: string, data: UpdateScheduleCommentsData): Promise<ScheduleWithRelations>;
  updateStatus(id: string, status: ScheduleStatus): Promise<ScheduleWithRelations>;
  delete(id: string): Promise<void>;
}
