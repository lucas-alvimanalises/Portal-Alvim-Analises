'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ServiceLabelGroupDto } from '@portal-alvim/shared';
import { labelsApi } from '../../../../../../lib/api/labels.api';
import { BarcodeLabel } from '../../../../../../components/agenda/BarcodeLabel';

// Tamanho físico real da etiqueta na Zebra ZD-220: 40x10mm (L x A).
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 10;
const SILOXANOS_CODE = '11000';

// Uma "folha" = uma etiqueta física (uma página no @page). Tipos:
// - divider: etiqueta só com o nome do composto, pra separar os rolos
// - label: etiqueta numerada (número + código de barras)
// - blank: etiqueta em branco (só Siloxanos, depois de cada grupo de 3)
type Sheet =
  | { kind: 'divider'; key: string; text: string }
  | { kind: 'label'; key: string; number: number }
  | { kind: 'blank'; key: string };

function buildServiceSheets(groups: ServiceLabelGroupDto[]): Sheet[] {
  const sheets: Sheet[] = [];
  for (const group of groups) {
    if (group.labels.length === 0) continue;
    sheets.push({ kind: 'divider', key: `div-${group.compoundId}`, text: group.compoundName });
    const isSiloxanos = group.compoundCode === SILOXANOS_CODE;
    for (const label of group.labels) {
      sheets.push({ kind: 'label', key: label.id, number: label.number });
      if (isSiloxanos && label.labelIndex === 3) {
        sheets.push({ kind: 'blank', key: `${label.id}-blank` });
      }
    }
  }
  return sheets;
}

function groupRange(group: ServiceLabelGroupDto): string {
  const nums = group.labels.map((l) => l.number);
  return `${Math.min(...nums)}–${Math.max(...nums)}`;
}

// "Imprimir Etiquetas Serviço" — junta as etiquetas de todos os compostos
// do agendamento num PDF/impressão só, com uma etiqueta divisória (nome do
// composto) antes de cada grupo pra o operador separar os rolos. Mesma
// regra de reserva de número do fluxo por composto: abrir a página não
// grava nada, só o clique em "Imprimir" (POST /labels/service-confirm)
// consome as sequências. Idempotente — reabrir mostra os mesmos números.
export default function ImprimirEtiquetasServicoPage() {
  const params = useParams<{ id: string }>();
  const [confirmedGroups, setConfirmedGroups] = useState<ServiceLabelGroupDto[] | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['labels', 'service-preview', params.id],
    queryFn: () => labelsApi.servicePreview(params.id),
    enabled: !confirmedGroups,
  });

  const confirmMutation = useMutation({
    mutationFn: () => labelsApi.serviceConfirm(params.id),
    onSuccess: (res) => {
      setConfirmedGroups(res.groups);
      window.print();
    },
  });

  const groups = (confirmedGroups ?? data?.groups ?? []).filter((g) => g.labels.length > 0);
  const allConfirmed = groups.length > 0 && groups.every((g) => g.confirmed);
  const sheets = buildServiceSheets(groups);

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none; }
          @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
          body { margin: 0; }
        }
        .label-sheet {
          width: ${LABEL_WIDTH_MM}mm;
          height: ${LABEL_HEIGHT_MM}mm;
          box-sizing: border-box;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          border: 1px solid #ccc;
          page-break-after: always;
          overflow: hidden;
        }
        .label-sheet svg { max-width: 95%; max-height: 95%; }
        .label-divider {
          align-items: center;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9px;
          line-height: 1.1;
          text-align: center;
          padding: 0 1mm;
        }
      `}</style>

      <div className="no-print">
        <div className="page-header">
          <h1>Imprimir etiquetas do serviço</h1>
        </div>

        {isLoading && <p style={{ color: 'var(--color-text-muted)' }}>Carregando…</p>}

        {!isLoading && groups.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Este agendamento não tem composto com etiqueta física (Siloxanos, Compostos Sulfurados ou VOCs).
          </p>
        )}

        {groups.length > 0 && (
          <>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {sheets.length} etiqueta(s) no total — cada grupo vem depois de uma etiqueta com o nome
              do composto. Confira o cabo da Zebra ZD-220 antes de imprimir (essa impressora não
              imprime em rede).
            </p>
            <ul style={{ fontSize: 13, marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
              {groups.map((g) => (
                <li key={g.compoundId}>
                  <strong>{g.compoundName}</strong> — {g.labels.length} etiqueta(s), números{' '}
                  {groupRange(g)}{' '}
                  {g.confirmed ? (
                    <span style={{ color: 'var(--color-primary)' }}>(já impressas)</span>
                  ) : (
                    <span style={{ color: '#854d0e' }}>(ainda não reservados)</span>
                  )}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              {allConfirmed ? (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  ✓ Todas já impressas — reimprimir usa os mesmos números.
                </span>
              ) : (
                <span style={{ color: '#854d0e' }}>
                  Clique em &quot;Imprimir&quot; para reservar os números e imprimir tudo de uma vez.
                </span>
              )}
            </p>
          </>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={isLoading || groups.length === 0 || confirmMutation.isPending}
          onClick={() => (allConfirmed ? window.print() : confirmMutation.mutate())}
        >
          {confirmMutation.isPending ? 'Confirmando...' : 'Imprimir'}
        </button>
        {(isError || confirmMutation.isError) && (
          <p style={{ color: 'var(--color-danger)' }}>Não foi possível gerar as etiquetas.</p>
        )}
      </div>

      {sheets.map((sheet) => (
        <div
          key={sheet.key}
          className={`label-sheet${sheet.kind === 'divider' ? ' label-divider' : ''}`}
        >
          {sheet.kind === 'label' && <BarcodeLabel value={sheet.number} />}
          {sheet.kind === 'divider' && <span>{sheet.text}</span>}
        </div>
      ))}
    </div>
  );
}
