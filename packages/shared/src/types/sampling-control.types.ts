import { SamplingControlSource } from '../enums';

// "Tabela de Controle de Amostras" — a planilha mestre da Alvim
// ("Identificação de Amostragens.xlsx"), uma linha por amostragem
// concluída. Colunas 1–8 vêm de dados que o portal já tem (Sample +
// cadeia de custódia); "Responsável pelo Faturamento" é manual e editável
// na tela. Ver SamplingControlRecord no schema e SamplingControlService.
export interface SamplingControlRecordDto {
  id: string;
  // "AAAA-MM-DD" (data sem horário) — Data do Serviço.
  serviceDate: string;
  clientName: string;
  clientId: string | null;
  compoundName: string;
  sampleIdentification: string | null;
  fieldReportNumber: string | null;
  pump: string | null;
  samplingPointName: string | null;
  observation: string | null;
  billingResponsible: string | null;
  source: SamplingControlSource;
  createdAt: string;
  updatedAt: string;
}

// Filtros da tabela: período (De/Até) e origem são "globais"; os demais são
// por coluna (substring, sem diferenciar maiúsculas/acentos no lado do
// cliente da busca). Todos são aplicados também no export em Excel.
export interface ListSamplingControlParams {
  startDate?: string;
  endDate?: string;
  source?: SamplingControlSource;
  clientName?: string;
  compoundName?: string;
  sampleIdentification?: string;
  fieldReportNumber?: string;
  pump?: string;
  samplingPointName?: string;
  observation?: string;
  billingResponsible?: string;
}

// Só o campo manual é editável pela tela — data/cliente/composto/etc. são
// sincronizados da cadeia de custódia e sobrescritos a cada regeração.
export interface UpdateSamplingControlRecordPayload {
  billingResponsible: string | null;
}
