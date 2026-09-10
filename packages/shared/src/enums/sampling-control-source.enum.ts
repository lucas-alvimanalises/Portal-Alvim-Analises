export enum SamplingControlSource {
  // Linha importada uma única vez da planilha mestre da Alvim
  // ("Identificação de Amostragens.xlsx") — amostragens até jul/2026.
  LEGACY_IMPORT = 'LEGACY_IMPORT',
  // Linha gravada pelo portal na aprovação da cadeia de custódia — ago/2026
  // em diante.
  PORTAL = 'PORTAL',
}

export const SAMPLING_CONTROL_SOURCE_LABELS_PT: Record<SamplingControlSource, string> = {
  [SamplingControlSource.LEGACY_IMPORT]: 'Planilha (histórico)',
  [SamplingControlSource.PORTAL]: 'Portal',
};
