'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PrintedLabelDto } from '@portal-alvim/shared';
import { labelsApi } from '../../../../../../../lib/api/labels.api';
import { BarcodeLabel } from '../../../../../../../components/agenda/BarcodeLabel';

// Tamanho físico real da etiqueta na Zebra ZD-220, confirmado com o usuário:
// 40x10mm (L x A).
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 10;

// Só o Siloxanos soma uma etiqueta em branco (sem número) depois das 3
// sequenciais de cada frasco (código do seed, ver apps/backend/prisma/seed.ts).
const SILOXANOS_CODE = '11000';

function buildSheets(labels: PrintedLabelDto[], isSiloxanos: boolean) {
  // Uma etiqueta em branco depois de cada grupo de 3 (mesmo ponto+frasco) —
  // só pra Siloxanos.
  const sheets: { label: PrintedLabelDto | null; key: string }[] = [];
  labels.forEach((label) => {
    sheets.push({ label, key: label.id });
    if (label.labelIndex === 3 && isSiloxanos) {
      sheets.push({ label: null, key: `${label.id}-blank` });
    }
  });
  return sheets;
}

// A etiqueta em si é só o número + código de barras (ver foto de referência
// enviada pelo usuário — é exatamente o que vai colado no frasco, sem nome
// de empresa/composto/ponto/data). Esses dados só aparecem na tela, fora da
// área de impressão, pra o operador conferir o que está imprimindo.
//
// Importante: abrir/atualizar esta página NUNCA reserva número nenhum — só
// é uma prévia calculada a partir do último número já usado (ver
// LabelsService.previewLabels). O número só é gravado de verdade quando o
// usuário clica em "Imprimir" (POST /labels/confirm); fechar a aba sem
// clicar não consome nada da sequência. Reabrir um serviço já impresso
// sempre mostra os mesmos números (idempotente).
export default function ImprimirEtiquetasPage() {
  const params = useParams<{ id: string; compoundId: string }>();
  const [confirmedLabels, setConfirmedLabels] = useState<PrintedLabelDto[] | null>(null);

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['labels', 'preview', params.id, params.compoundId],
    queryFn: () => labelsApi.preview({ scheduleId: params.id, compoundId: params.compoundId }),
    // Já confirmado nesta mesma visita — não precisa mais ficar
    // reconferindo a prévia (evita "piscar" números depois de imprimir).
    enabled: !confirmedLabels,
  });

  const confirmMutation = useMutation({
    mutationFn: () => labelsApi.confirm({ scheduleId: params.id, compoundId: params.compoundId }),
    onSuccess: (labels) => {
      setConfirmedLabels(labels);
      // Só imprime depois de garantir que os números foram
      // reservados/gravados de verdade — nunca antes.
      window.print();
    },
  });

  const labels = confirmedLabels ?? preview?.labels ?? [];
  const isConfirmed = !!confirmedLabels || !!preview?.confirmed;
  const isSiloxanos = labels[0]?.compoundCode === SILOXANOS_CODE;
  const sheets = buildSheets(labels, isSiloxanos);

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
          /* Rente embaixo, não centralizado — mesma posição do arquivo de
             referência da Alvim no ZebraDesigner (objeto a ~3,5mm do topo,
             quase encostando no fundo dos 10mm de altura da etiqueta). O
             espaço vazio em cima é de propósito: folga pro sensor de gap/
             corte da ZD-220 perto da borda de entrada da etiqueta. */
          align-items: flex-end;
          justify-content: center;
          border: 1px solid #ccc;
          page-break-after: always;
          overflow: hidden;
        }
        .label-sheet svg {
          max-width: 95%;
          max-height: 95%;
        }
      `}</style>

      <div className="no-print">
        <div className="page-header">
          <h1>Imprimir etiquetas</h1>
        </div>
        {labels.length > 0 && (
          <>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
              {labels[0].clientName} — {labels[0].compoundName} ({labels[0].samplingPointName}) —{' '}
              {sheets.length} etiqueta(s)
              {isSiloxanos ? ' (3 numeradas + 1 em branco por amostra)' : ' (3 numeradas por amostra)'}.
              Confira o cabo da Zebra ZD-220 antes de imprimir (essa impressora não imprime em rede).
            </p>
            <p style={{ fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              {isConfirmed ? (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  ✓ Já impressa — números {Math.min(...labels.map((l) => l.number))} a{' '}
                  {Math.max(...labels.map((l) => l.number))}
                </span>
              ) : (
                <span style={{ color: '#854d0e' }}>
                  Pré-visualização — números {Math.min(...labels.map((l) => l.number))} a{' '}
                  {Math.max(...labels.map((l) => l.number))} ainda não reservados. Clique em
                  &quot;Imprimir&quot; para confirmar.
                </span>
              )}
            </p>
          </>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={isLoading || labels.length === 0 || confirmMutation.isPending}
          onClick={() => (isConfirmed ? window.print() : confirmMutation.mutate())}
        >
          {confirmMutation.isPending ? 'Confirmando...' : 'Imprimir'}
        </button>
        {(isError || confirmMutation.isError) && (
          <p style={{ color: 'var(--color-danger)' }}>Não foi possível gerar as etiquetas.</p>
        )}
      </div>

      {sheets.map((sheet) => (
        <div key={sheet.key} className="label-sheet">
          {sheet.label && <BarcodeLabel value={sheet.label.number} />}
        </div>
      ))}
    </div>
  );
}
