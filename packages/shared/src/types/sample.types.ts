import { AnalysisStatus, ComplianceStatus } from '../enums';

export interface SampleResultRowDto {
  id: string;
  parameterName: string;
  result: string;
  unit: string;
  specLimit: string | null;
  compliance: ComplianceStatus | null;
  notes: string | null;
  order: number;
}

export interface ResultRowInput {
  parameterName: string;
  result: string;
  unit: string;
  specLimit?: string;
  compliance?: ComplianceStatus;
  notes?: string;
  order: number;
}

export interface SampleDto {
  id: string;
  clientId: string;
  clientName?: string;
  scheduleId: string;
  scheduleDate?: string;
  samplingPointId: string | null;
  samplingPointName?: string;
  // Composto amostrado — define em qual "pasta" (11000 - Siloxanos etc.)
  // a amostra aparece na tela de Amostras.
  compoundId: string | null;
  compoundCode?: string;
  compoundName?: string;
  collectionDate: string;
  collectionLocation: string | null;
  responsibleUserId: string | null;
  responsibleUserName?: string;
  analysisType: string | null;
  notes: string | null;
  active: boolean;
  // Código/número da amostra usado pelo laboratório (opcional).
  sampleCode: string | null;
  // Andamento da análise — independente de já ter certificado anexado.
  analysisStatus: AnalysisStatus;
  resultRows: SampleResultRowDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSamplePayload {
  clientId: string;
  scheduleId: string;
  samplingPointId?: string;
  compoundId: string;
  collectionDate: string;
  collectionLocation?: string;
  responsibleUserId?: string;
  analysisType?: string;
  notes?: string;
  sampleCode?: string;
  analysisStatus?: AnalysisStatus;
}

export type UpdateSamplePayload = Partial<Omit<CreateSamplePayload, 'clientId' | 'scheduleId'>> & {
  active?: boolean;
};

export interface ReplaceSampleResultRowsPayload {
  rows: ResultRowInput[];
}

// Uma linha da tela "Certificados Pendentes" — uma amostra/análise ainda
// sem nenhum Certificate anexado (não é o mesmo que Sample.analysisStatus
// === PENDING: esse também fica PENDING por falta de cadeia de custódia
// aprovada, o que não tem nada a ver com "falta certificado" — ver
// ListPendingCertificatesUseCase). hasCompound é repassado pro mesmo
// componente de upload já usado em /agendamentos/:id/resultados
// (CertificateExtractionSection), que precisa saber se a leitura por IA
// está disponível.
export interface PendingCertificateDto {
  sampleId: string;
  scheduleId: string;
  serviceDate: string;
  clientName: string;
  serviceTypeName: string;
  samplingPointName: string;
  compoundLabel: string;
  hasCompound: boolean;
  // Técnico(s) responsável(is) pela coleta do serviço — mesma relação
  // Schedule.technicians usada em ScheduleListView; permite filtrar a fila de
  // pendentes por quem coletou (ver especificação de filtros de Certificados
  // Pendentes).
  technicianNames: string[];
}
