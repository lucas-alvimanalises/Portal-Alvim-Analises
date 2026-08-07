import { AnalysisStatus, ComplianceStatus, Sample } from '@prisma/client';

export interface CreateSampleData {
  clientId: string;
  scheduleId: string;
  samplingPointId?: string;
  compoundId: string;
  collectionDate: Date;
  collectionLocation?: string;
  responsibleUserId?: string;
  analysisType?: string;
  notes?: string;
  sampleCode?: string;
  analysisStatus?: AnalysisStatus;
}

export type UpdateSampleData = Partial<Omit<CreateSampleData, 'clientId' | 'scheduleId'>> & {
  active?: boolean;
};

export interface ResultRowData {
  parameterName: string;
  result: string;
  unit: string;
  specLimit?: string;
  compliance?: ComplianceStatus;
  notes?: string;
  order: number;
}

export type SampleWithRelations = Sample & {
  client?: { companyName: string } | null;
  schedule?: { scheduledDate: Date } | null;
  samplingPoint?: { name: string } | null;
  compound?: { code: string; name: string } | null;
  responsibleUser?: { name: string } | null;
  resultRows?: {
    id: string;
    parameterName: string;
    result: string;
    unit: string;
    specLimit: string | null;
    compliance: ComplianceStatus | null;
    notes: string | null;
    order: number;
  }[];
};

export const SAMPLE_REPOSITORY = Symbol('SAMPLE_REPOSITORY');

export interface SampleRepository {
  findById(id: string): Promise<SampleWithRelations | null>;
  findMany(where?: Record<string, unknown>): Promise<SampleWithRelations[]>;
  create(data: CreateSampleData): Promise<SampleWithRelations>;
  update(id: string, data: UpdateSampleData): Promise<SampleWithRelations>;
  deactivate(id: string): Promise<SampleWithRelations>;
  // Substitui o conjunto inteiro de linhas de resultado de uma amostra
  // (mesmo padrão "apaga e recria numa transação" usado em outras relações
  // N:N do app — ver PrismaScheduleRepository.update()).
  replaceResultRows(sampleId: string, rows: ResultRowData[]): Promise<SampleWithRelations>;
  // Usado por "Copiar estrutura do serviço anterior": encontra o schedule
  // mais recente do mesmo cliente (excluindo o alvo) que já tem amostras.
  findMostRecentScheduleIdWithSamples(
    clientId: string,
    excludingScheduleId: string,
  ): Promise<string | null>;
  // Recria, num novo schedule, a mesma estrutura de amostras + linhas de
  // resultado (em branco) de um schedule de origem.
  copyStructureToSchedule(
    sourceScheduleId: string,
    targetScheduleId: string,
    targetCollectionDate: Date,
  ): Promise<SampleWithRelations[]>;
}
