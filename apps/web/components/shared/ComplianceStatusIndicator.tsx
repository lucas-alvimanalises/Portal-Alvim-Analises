import { ComplianceStatus, COMPLIANCE_STATUS_COLORS, COMPLIANCE_STATUS_LABELS_PT } from '@portal-alvim/shared';

// Componente único de "situação" (Conforme/Atenção/Fora da especificação/Não
// aplicável) — antes cada tela (Resultados, Reportes ANP, Resumo de
// Resultados) desenhava esse indicador do seu próprio jeito (chip de texto
// isolado num lugar, bolinha+emoji+texto com linha vermelha em outro).
// Referência visual escolhida pelo usuário: a tela de Reportes ANP
// ("bolinha colorida + texto, linha inteira destacada quando fora da
// especificação"). `compliance === null` representa "sem limite definido"
// (SampleResultRow.compliance nullable) — não é um estado de negócio novo,
// só precisa de uma representação visual consistente em vez de um '-' solto.
const NAO_APLICAVEL_COLORS = { background: '#f1f5f9', text: '#64748b' };

export function ComplianceStatusIndicator({ compliance }: { compliance: ComplianceStatus | null }) {
  const colors = compliance ? COMPLIANCE_STATUS_COLORS[compliance] : NAO_APLICAVEL_COLORS;
  const label = compliance ? COMPLIANCE_STATUS_LABELS_PT[compliance] : 'Não aplicável';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <span
        aria-hidden
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: colors.text,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

// Destaque de linha inteira — só pras duas situações que precisam chamar
// atenção na tabela (Fora da especificação com destaque forte, igual à
// referência do ANP; Atenção com um destaque mais discreto pra não competir
// visualmente com o estado mais grave). Conforme e Não aplicável não alteram
// o fundo da linha.
export function getComplianceRowStyle(compliance: ComplianceStatus | null): React.CSSProperties | undefined {
  if (compliance === ComplianceStatus.NAO_CONFORME) {
    return { background: '#fee2e2', color: '#991b1b' };
  }
  if (compliance === ComplianceStatus.ATENCAO) {
    return { background: '#fefce8' };
  }
  return undefined;
}
