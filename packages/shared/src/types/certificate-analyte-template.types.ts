// Define quais análises (parâmetros) a IA deve procurar no certificado
// laboratorial de cada composto, e a qual unidade dar preferência quando o
// laudo traz o mesmo resultado em várias unidades (ex.: mg/m³, ppb, µg/m³,
// ppm — ver ClaudeCertificateOcrService). regulatoryLimit/limitUnit são
// valores fixos (não lidos do laudo): quando presentes, a aprovação da
// leitura calcula "Situação" comparando o resultado extraído contra esse
// limite — Conforme abaixo de warningThreshold (quando definido) ou do
// próprio limite, Atenção entre warningThreshold e regulatoryLimit (ex.:
// Siloxanos — Conforme até 0,21 mg Si/m³, Atenção até 0,3, Não Conforme
// acima), Não Conforme acima do limite. Ausentes quando o composto não tem
// limite regulatório definido para aquele parâmetro (mas ainda assim
// monitorado).
export interface CertificateAnalyteConfig {
  key: string;
  // Vira o "Composto" (parameterName) na linha de resultado.
  label: string;
  // Texto exato (ou aproximado) da coluna "Análise" no laudo, usado no prompt
  // pra IA localizar a linha certa em meio a dezenas de parâmetros.
  reportAnalyteName: string;
  // Descrição da família de unidade a preferir quando o laudo repete o
  // mesmo resultado em unidades diferentes — ex.: "mg Cl/m³ (família mg.../m³)".
  unitHint: string;
  regulatoryLimit?: number;
  limitUnit?: string;
  // Patamar de atenção, abaixo do limite regulatório — opcional, só faz
  // sentido junto de regulatoryLimit.
  warningThreshold?: number;
  // Piso da faixa regulatória — opcional, só faz sentido junto de
  // regulatoryLimit. Quando definido, o resultado também precisa ser >= esse
  // valor pra ser Conforme (ex.: COG de Compostos Sulfurados — faixa de
  // 15 a 30 mg/m³, confirmado com o usuário). Sem warningThreshold nesse caso
  // (fora da faixa pra qualquer lado já é Não Conforme direto).
  regulatoryMin?: number;
}

// PER_ANALYTE (padrão): cada análise configurada vira uma linha de resultado
// na amostra. COLLAPSE_BELOW_LQ: pra painéis onde o que importa é só "tudo
// abaixo do limite de quantificação ou não" (ex.: Metais, ~30 parâmetros por
// laudo, ou Mercúrio, 1 parâmetro só) — se TODOS os resultados extraídos
// vierem com "<" na frente, a aprovação gera uma única linha resumo
// (collapsedResultLabel) com resultado "<LQ"; se algum vier sem "<"
// (quantificado), lista só os quantificados, cada um com seu próprio nome e
// valor. SKIP_ZERO: pra laudos que reportam não-detectado como "0,00" em vez
// de "<" (ex.: Compostos Sulfurados) — cada parâmetro com valor não-zero
// vira sua própria linha (igual PER_ANALYTE), mas os que vierem exatamente
// "0,00" são omitidos, sem linha resumo (ver ApproveCertificateExtractionUseCase).
export type CertificateResultsMode = 'PER_ANALYTE' | 'COLLAPSE_BELOW_LQ' | 'SKIP_ZERO';

export interface CertificateAnalyteTemplateDto {
  id: string;
  compoundId: string;
  compoundCode: string;
  compoundName: string;
  analytes: CertificateAnalyteConfig[];
  resultsMode: CertificateResultsMode;
  collapsedResultLabel: string | null;
}
