import {
  ComplianceStatus,
  MAINTENANCE_NATURE_LABELS_PT,
  MAINTENANCE_TYPE_OPTIONS,
  MaintenanceStatus,
  PlantMaintenanceDto,
  SampleDto,
} from '@portal-alvim/shared';

// O texto de "result" às vezes já vem com a unidade embutida (ex.: leitura
// de certificado por IA salva "<0,04 mg/m³" direto) e às vezes não (edição
// manual salva só "0,04") — só concatena o campo "unit" separado quando ele
// ainda não aparece no texto, pra não duplicar. Usado tanto na tabela
// single-série quanto na tabela de comparação.
export function formatResultCell(result: string, unit: string): string {
  if (!unit || result.includes(unit)) return result;
  return `${result} ${unit}`;
}

// Extrai o primeiro número do texto do resultado (ex.: "< 0,04 mg/m³" →
// 0.04) — mesma lógica conservadora usada no cálculo de conformidade no
// backend (certificate-compliance.util.ts): "< X" é tratado como "no máximo
// X" pra poder plotar um ponto mesmo pra resultados abaixo do limite de
// quantificação. null quando não há número legível (ex.: "<LQ").
export function parseNumericValue(resultText: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(resultText);
  if (!match) return null;
  return Number(match[0].replace(',', '.'));
}

// Datas de filtro são digitadas soltas (sem hora) — comparadas contra
// collectionDate (meia-noite UTC) também em UTC, mesmo padrão usado no
// resto do app (ver formatPeriod em ScheduleListView.tsx), pra não sofrer
// deslocamento de 1 dia por causa do fuso do Brasil.
export function parseFilterDateUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export interface TrendPoint {
  date: Date;
  value: number;
  rawResult: string;
  unit: string;
  compliance: ComplianceStatus | null;
}

// Parâmetros que não são resultado de análise (não fazem sentido num
// gráfico de tendência de concentração) — Siloxanos tem "Volume Amostrado"
// misturado nos resultados só porque o schema genérico de leitura de
// certificado trata qualquer campo lido como "mais um resultado" (ver
// certificate-analyte-template.types.ts); a tabela continua mostrando
// normalmente, só os gráficos pulam (confirmado com o usuário).
export const CHART_EXCLUDED_PARAMETERS = new Set(['Volume Amostrado']);

// Siloxanos: "<0,21 mg Si/m³" quer dizer "não detectado, abaixo do limite de
// quantificação" — no gráfico de tendência isso é tratado como 0,00 em vez
// do valor do limite, senão a linha parece oscilar perto de 0,21 quando na
// real é "nada detectado" (confirmado com o usuário, só pra Siloxanos por
// enquanto). Usado tanto no gráfico single-série quanto no de comparação.
export function resolveChartValue(compoundName: string | undefined, result: string): number | null {
  const isSiloxanos = compoundName === 'Siloxanos';
  const isBelowLQ = result.includes('<');
  return isSiloxanos && isBelowLQ ? 0 : parseNumericValue(result);
}

// Ordem de severidade pra comparar duas categorias de conformidade — usado
// no destaque "piorou/melhorou" da coluna de eficiência (ver
// MultiSeriesTrendTable): comparar só o valor numérico bruto erraria
// parâmetros com faixa (ex.: COG, Não Conforme tanto acima quanto abaixo do
// intervalo — ver regulatoryMin em certificate-compliance.util.ts).
export const COMPLIANCE_SEVERITY: Record<ComplianceStatus, number> = {
  [ComplianceStatus.CONFORME]: 0,
  [ComplianceStatus.ATENCAO]: 1,
  [ComplianceStatus.NAO_CONFORME]: 2,
};

// Chave de coluna comum à tabela e ao gráfico de comparação (ver
// MultiSeriesTrendTable/MultiSeriesTrendChart) — as duas têm que bater
// exatamente, senão tabela e gráfico contam histórias diferentes pro mesmo
// dado. 'exact-date': pontos da mesma empresa (visitas batem no mesmo dia,
// confirmado no banco). 'month': empresas diferentes (agendas
// independentes nunca coincidem por dia).
export type ComparisonColumnMode = 'exact-date' | 'month';

export function columnKeyFor(collectionDate: string, mode: ComparisonColumnMode): string {
  return mode === 'month' ? collectionDate.slice(0, 7) : collectionDate.slice(0, 10);
}

export function columnLabelFor(key: string, mode: ComparisonColumnMode): string {
  if (mode === 'exact-date') {
    return new Date(`${key}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'short',
    year: 'numeric',
  });
}

// Quando há mais de uma amostra do mesmo composto na mesma data/mês pro
// mesmo ponto (ex.: "Amostra 1 de 2"), usa a mais recentemente atualizada —
// simplificação necessária pra poder alinhar uma célula/ponto só por coluna.
export function pickRepresentative(samples: SampleDto[]): SampleDto {
  return samples.reduce((latest, sample) =>
    new Date(sample.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? sample : latest,
  );
}

export function buildRepresentativeByColumn(
  samples: SampleDto[],
  mode: ComparisonColumnMode,
): Map<string, SampleDto> {
  const buckets = new Map<string, SampleDto[]>();
  samples.forEach((sample) => {
    const key = columnKeyFor(sample.collectionDate, mode);
    const list = buckets.get(key) ?? [];
    list.push(sample);
    buckets.set(key, list);
  });
  const result = new Map<string, SampleDto>();
  buckets.forEach((list, key) => result.set(key, pickRepresentative(list)));
  return result;
}

// Posição fracionária (0..N-1) de uma data "solta" (ex.: evento de
// manutenção) dentro do eixo de um gráfico de tendência — os gráficos
// (MiniTrendChart/MultiParameterChart) espaçam os pontos por ÍNDICE, não por
// tempo real, então "onde cai" uma data qualquer exige achar entre quais
// dois pontos vizinhos ela está e interpolar usando os timestamps reais
// deles. Fora do intervalo conhecido, gruda no primeiro/último índice (não
// estica o eixo pra fora dos dados existentes). xAt(index) dos gráficos já é
// linear em index, então um índice fracionário funciona sem mudar xAt.
export function fractionalIndexForTime(time: number, times: number[]): number | null {
  if (times.length === 0) return null;
  if (time <= times[0]) return 0;
  if (time >= times[times.length - 1]) return times.length - 1;
  for (let i = 0; i < times.length - 1; i++) {
    const t0 = times[i];
    const t1 = times[i + 1];
    if (time >= t0 && time <= t1) {
      const frac = t1 === t0 ? 0 : (time - t0) / (t1 - t0);
      return i + frac;
    }
  }
  return null;
}

// Timestamp de referência de uma chave de coluna do gráfico de comparação —
// início do dia (exact-date) ou início do mês (month), mesma convenção UTC
// usada em columnLabelFor.
export function columnKeyToTime(key: string, mode: ComparisonColumnMode): number {
  if (mode === 'exact-date') return Date.parse(`${key}T00:00:00Z`);
  const [year, month] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, 1);
}

function maintenanceTypeLabel(key: string): string {
  return MAINTENANCE_TYPE_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

export interface MaintenanceMarkerData {
  id: string;
  date: Date;
  // Natureza (Preventiva, Corretiva...) — vira o rótulo curto do marcador.
  label: string;
  // Tipo(s) + descrição, já formatado — vai no tooltip.
  detail: string;
  // Só usado no gráfico de comparação entre empresas: cor da série
  // correspondente, pra distinguir de qual empresa é o evento.
  color?: string;
}

// Converte manutenções da planta (já filtradas por empresa/período pelo
// caller) em marcadores de gráfico — Cancelada não entra (não aconteceu de
// verdade); Programada/Em andamento/Concluída entram todas, mesmo eventos
// futuros são informativos pra quem está olhando a tendência.
export function buildMaintenanceMarkers(
  maintenances: PlantMaintenanceDto[],
  color?: string,
): MaintenanceMarkerData[] {
  return maintenances
    .filter((m) => m.status !== MaintenanceStatus.CANCELLED)
    .map((m) => ({
      id: m.id,
      date: new Date(m.date),
      label: MAINTENANCE_NATURE_LABELS_PT[m.nature],
      detail:
        [m.types.map(maintenanceTypeLabel).join(', ') || null, m.otherType, m.description]
          .filter(Boolean)
          .join(' — ') || m.description,
      color,
    }));
}

export interface CompoundGroup {
  compoundId: string;
  compoundName: string;
  samples: SampleDto[];
}

// Agrupa amostras por composto — usado tanto na visão single-ponto
// (HistoricoPontoContent) quanto nas duas telas de comparação, pra montar
// as opções do seletor de composto e os dados de cada série.
export function groupSamplesByCompound(samples: SampleDto[]): CompoundGroup[] {
  const groups = new Map<string, CompoundGroup>();
  samples
    .filter((s) => s.compoundId)
    .forEach((sample) => {
      const key = sample.compoundId!;
      const group = groups.get(key) ?? { compoundId: key, compoundName: sample.compoundName ?? 'Composto', samples: [] };
      group.samples.push(sample);
      groups.set(key, group);
    });
  return Array.from(groups.values()).sort((a, b) => a.compoundName.localeCompare(b.compoundName));
}
