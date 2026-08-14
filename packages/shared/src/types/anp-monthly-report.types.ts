import { AnpReportParameter, ComplianceStatus } from '../enums';

export interface AnpRegulatoryLimitDto {
  parameter: AnpReportParameter;
  label: string;
  regulatoryLimit: number;
  unit: string;
  updatedAt: string;
  updatedByName: string | null;
}

export interface UpdateAnpRegulatoryLimitItem {
  parameter: AnpReportParameter;
  regulatoryLimit: number;
  unit: string;
}

export type UpdateAnpRegulatoryLimitsPayload = UpdateAnpRegulatoryLimitItem[];

// Status de um mês dentro do módulo — ver "Estrutura do módulo" do pedido
// original (✅/⏳/❌).
export enum AnpMonthStatus {
  // Ainda não há os 3 resultados necessários (Siloxanos + Fluorados +
  // Clorados) na 1ª Barreira (ANP) desse mês.
  MISSING_DATA = 'MISSING_DATA',
  // Os 3 resultados já existem, mas nenhum PDF foi gerado ainda.
  PENDING = 'PENDING',
  // PDF já gerado (pode estar desatualizado — ver `isStale` no detalhe).
  GENERATED = 'GENERATED',
}

export interface AnpReportResultRow {
  parameter: AnpReportParameter;
  label: string;
  // Data da coleta desse resultado específico — um mês pode ter mais de um
  // atendimento (visita), cada um com sua própria amostra/resultado; todos
  // entram no reporte, não só o mais recente (confirmado com o usuário).
  date: string;
  // Texto já formatado pro PDF/tela (ex.: "0,12 mg Si/m³").
  result: string;
  regulatoryLimit: number;
  unit: string;
  compliance: ComplianceStatus;
  // Nº do certificado emitido pelo laboratório para essa amostra — o cliente
  // usa esse número pra anexar o resultado no portal da ANP. Null quando a
  // amostra ainda não tem certificado anexado.
  certificateNumber: string | null;
}

export interface AnpMonthlyReportDto {
  id: string;
  clientId: string;
  clientName: string;
  year: number;
  month: number;
  version: number;
  reportNumber: number;
  generatedByName: string;
  createdAt: string;
}

export interface AnpMonthBadgeDto {
  year: number;
  month: number;
  status: AnpMonthStatus;
}

export interface AnpEligibleClientDto {
  clientId: string;
  clientName: string;
  anpPointCount: number;
  lastReportGeneratedAt: string | null;
  currentMonthStatus: AnpMonthStatus;
  // true se HOUVER algum mês (não só o corrente) com dados completos e
  // ainda sem reporte gerado — indicador de "tem algo pra liberar" usado
  // no badge da lista de empresas (nível 1), diferente de currentMonthStatus
  // (que olha só o mês corrente).
  hasPendingReports: boolean;
}

export interface AnpModuleSummaryDto {
  totalEligibleClients: number;
  reportsGeneratedThisMonth: number;
  pendingThisMonth: number;
  nonConformingThisMonth: number;
  lastSystemUpdate: string | null;
}

// Cliente com pelo menos um resultado "Fora da especificação" no mês
// corrente — usado pelo bloco "Compliance do mês" do Dashboard pra linkar
// direto pro Reporte Mensal ANP daquele cliente/mês (ver
// AnpDashboardComplianceDto).
export interface AnpComplianceAffectedClientDto {
  clientId: string;
  clientName: string;
  year: number;
  month: number;
}

// Agregado entre TODOS os clientes elegíveis pro Reportes ANP, mês corrente
// — mesma fonte de dados/cálculo de conformidade do módulo Reportes Mensais
// ANP (nenhuma lógica nova, só uma visão consolidada pro Dashboard). Contagens
// são de RESULTADOS (linhas), não de clientes — um cliente com 2 parâmetros
// fora da especificação no mesmo mês conta 2 em outOfSpecCount.
export interface AnpDashboardComplianceDto {
  outOfSpecCount: number;
  attentionCount: number;
  affectedClients: AnpComplianceAffectedClientDto[];
}

export interface AnpMonthDetailDto {
  clientId: string;
  clientName: string;
  cnpj: string;
  year: number;
  month: number;
  samplingPointName: string | null;
  technicianNames: string[];
  status: AnpMonthStatus;
  // Preenchido sempre que status != MISSING_DATA — dá pra conferir os
  // valores mesmo antes de gerar o PDF de verdade.
  rows: AnpReportResultRow[];
  currentReport: AnpMonthlyReportDto | null;
  // Só relevante quando currentReport existe: os 3 valores de origem
  // mudaram desde que essa versão foi gerada.
  isStale: boolean;
  // Todas as versões já geradas pra esse mês, mais recente primeiro.
  history: AnpMonthlyReportDto[];
}
