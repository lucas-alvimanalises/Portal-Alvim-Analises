export enum AnalysisStatus {
  PENDING = 'PENDING',
  IN_ANALYSIS = 'IN_ANALYSIS',
  COMPLETED = 'COMPLETED',
}

export const ANALYSIS_STATUS_LABELS_PT: Record<AnalysisStatus, string> = {
  [AnalysisStatus.PENDING]: 'Pendente',
  [AnalysisStatus.IN_ANALYSIS]: 'Em análise',
  [AnalysisStatus.COMPLETED]: 'Concluída',
};
