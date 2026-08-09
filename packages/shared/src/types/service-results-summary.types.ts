import { ComplianceStatus } from '../enums';

// Uma linha do resumo consolidado — mesmos campos já preenchidos na tabela
// "Resultados analíticos" de cada amostra (ver SampleResultRowDto), só que
// carregando também o ponto de amostragem de origem e a categoria (ver
// parameter-category.util.ts no backend), pra permitir agrupar na tela/PDF
// sem precisar recruzar dados no frontend.
export interface ServiceResultsSummaryRow {
  samplingPointId: string;
  samplingPointName: string;
  category: string;
  parameterName: string;
  result: string;
  unit: string;
  specLimit: string | null;
  compliance: ComplianceStatus | null;
  notes: string | null;
}

// Uma linha da seção comparativa 1ª Barreira → 2ª Barreira — só existe
// quando o serviço tem os dois pontos e o parâmetro aparece em ambos.
// variationLabel já vem em linguagem simples ("reduziu 88%", "sem
// alteração", "não comparável"), calculado no backend (ver
// barreira-comparison.util.ts).
export interface BarreiraComparisonRow {
  parameterName: string;
  firstBarreiraValue: string;
  secondBarreiraValue: string;
  variationLabel: string;
}

// Dados prontos pra tela de pré-visualização — tudo somente leitura, já
// consolidado e ordenado pelo backend (mesma ordem da tela de resultados).
// latestComment vem preenchido com o comentário da última versão já gerada
// (null se nunca foi gerado), pra reabrir o gerador já com o texto anterior.
// rows já vem SEM os parâmetros que entraram em barreiraComparison (evita
// duplicar a mesma informação nas duas seções — mesmo corte usado no PDF).
export interface ServiceResultsSummaryPreviewDto {
  scheduleId: string;
  clientName: string;
  cnpj: string;
  formattedPeriod: string;
  samplingPointNames: string[];
  technicianNames: string[];
  rows: ServiceResultsSummaryRow[];
  barreiraComparison: BarreiraComparisonRow[] | null;
  latestComment: string | null;
}

export interface ServiceResultsSummaryDto {
  id: string;
  scheduleId: string;
  version: number;
  comment: string;
  generatedByName: string;
  createdAt: string;
}

// Só a versão mais recente por serviço — alimenta o indicador da tabela de
// Realizados (ver ScheduleListView), sem duplicar dado: é a mesma tabela
// service_results_summaries por trás do histórico completo em
// ResultsSummaryHistory, só que agregada por scheduleId. Ausência de entrada
// pra um scheduleId = nenhum resumo gerado ainda.
export interface ServiceResultsSummaryLatestDto {
  scheduleId: string;
  version: number;
  createdAt: string;
  generatedByName: string;
}

export interface GenerateServiceResultsSummaryPayload {
  comment: string;
}
