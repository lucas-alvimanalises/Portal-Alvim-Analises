import { SamplingControlRecordDto } from '../types/sampling-control.types';
import { ListSamplingControlParams } from '../types/sampling-control.types';

// Normaliza pra comparação de texto: sem acento, minúsculo, sem espaço nas
// pontas. "Metagás" e "metagas" passam a bater; "Paulínia" e "paulinia"
// também. Usado no filtro da tela E no export em Excel (mesma função pros
// dois, pra planilha exportada bater exatamente com o que está na tela).
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function textMatches(field: string | null, term?: string): boolean {
  if (!term || !term.trim()) return true;
  return normalize(field ?? '').includes(normalize(term));
}

// Predicado único da "Tabela de Controle de Amostras". `serviceDate` do
// registro é "AAAA-MM-DD"; startDate/endDate idem (comparação lexicográfica
// direta funciona nesse formato).
export function matchesSamplingControlFilters(
  record: SamplingControlRecordDto,
  params: ListSamplingControlParams,
): boolean {
  if (params.startDate && record.serviceDate < params.startDate) return false;
  if (params.endDate && record.serviceDate > params.endDate) return false;
  if (params.source && record.source !== params.source) return false;
  return (
    textMatches(record.clientName, params.clientName) &&
    textMatches(record.compoundName, params.compoundName) &&
    textMatches(record.sampleIdentification, params.sampleIdentification) &&
    textMatches(record.fieldReportNumber, params.fieldReportNumber) &&
    textMatches(record.pump, params.pump) &&
    textMatches(record.samplingPointName, params.samplingPointName) &&
    textMatches(record.observation, params.observation) &&
    textMatches(record.billingResponsible, params.billingResponsible)
  );
}
