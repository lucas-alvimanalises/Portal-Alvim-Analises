import { AnpMonthStatus } from '../types/anp-monthly-report.types';

// ✅/⏳/❌ do pedido original — rótulo + ícone juntos, um só lugar pra
// alterar o texto/emoji das duas telas (nível 1 e nível 2).
export const ANP_MONTH_STATUS_LABELS_PT: Record<AnpMonthStatus, string> = {
  [AnpMonthStatus.MISSING_DATA]: 'Sem dados suficientes',
  [AnpMonthStatus.PENDING]: 'Dados disponíveis',
  [AnpMonthStatus.GENERATED]: 'Reporte gerado',
};

export const ANP_MONTH_STATUS_ICONS: Record<AnpMonthStatus, string> = {
  [AnpMonthStatus.MISSING_DATA]: '❌',
  [AnpMonthStatus.PENDING]: '⏳',
  [AnpMonthStatus.GENERATED]: '✅',
};

export const ANP_MONTH_STATUS_COLORS: Record<AnpMonthStatus, { background: string; text: string }> = {
  [AnpMonthStatus.MISSING_DATA]: { background: '#f1f5f9', text: '#64748b' },
  [AnpMonthStatus.PENDING]: { background: '#fef3c7', text: '#92400e' },
  [AnpMonthStatus.GENERATED]: { background: '#dcfce7', text: '#15803d' },
};
