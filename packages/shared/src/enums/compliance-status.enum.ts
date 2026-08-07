export enum ComplianceStatus {
  CONFORME = 'CONFORME',
  // Dentro do limite regulatório, mas acima de um patamar de atenção
  // definido por composto (ex.: Siloxanos — abaixo de 0,3 mg Si/m³ é
  // Conforme, mas a partir de 0,21 mg Si/m³ já merece acompanhamento).
  ATENCAO = 'ATENCAO',
  NAO_CONFORME = 'NAO_CONFORME',
}

export const COMPLIANCE_STATUS_LABELS_PT: Record<ComplianceStatus, string> = {
  [ComplianceStatus.CONFORME]: 'Conforme',
  [ComplianceStatus.ATENCAO]: 'Atenção',
  [ComplianceStatus.NAO_CONFORME]: 'Fora da especificação',
};

export const COMPLIANCE_STATUS_COLORS: Record<ComplianceStatus, { background: string; text: string }> = {
  [ComplianceStatus.CONFORME]: { background: '#dcfce7', text: '#15803d' },
  [ComplianceStatus.ATENCAO]: { background: '#fef9c3', text: '#854d0e' },
  [ComplianceStatus.NAO_CONFORME]: { background: '#fee2e2', text: '#b91c1c' },
};
