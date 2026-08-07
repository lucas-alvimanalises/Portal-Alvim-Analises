'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ANALYSIS_STATUS_LABELS_PT, Role, SampleDto } from '@portal-alvim/shared';
import { samplesApi } from '../../lib/api/samples.api';
import { custodyExtractionsApi } from '../../lib/api/custody-extractions.api';
import { useCurrentUser } from '../../lib/auth/useCurrentUser';
import { CertificateList } from './CertificateList';
import { CertificateExtractionSection } from './CertificateExtractionSection';
import { ResultsTable } from './ResultsTable';
import { CustodyExtractionSection } from './CustodyExtractionSection';

interface SampleResultCardProps {
  sample: SampleDto;
}

// Extrai o nº do relatório de campo do nome do PDF gerado (ex.:
// "11150_26 - Cadeia de Custódia Siloxanos.pdf" → "11150_26").
function reportNumberFromFilename(filename: string): string | null {
  return /^(\d+_\d{2})/.exec(filename)?.[1] ?? null;
}

// Cabeçalho da análise (composto/código/data) + lista de certificados +
// tabela de resultados. Código da amostra e Data da coleta são preenchidos
// manualmente só até a cadeia de custódia ser aprovada — a partir daí, esses
// dois campos passam a vir de lá automaticamente (ver
// ApproveCustodyExtractionUseCase), então continuam editáveis aqui só como
// fallback/ajuste manual. Formulário inline pequeno, e não uma reutilização
// do SampleForm.tsx: aquele é pensado pra navegação de página inteira com
// seletor de schedule/composto, que aqui já estão fixos.
//
// Cliente só visualiza: não gera cadeia de custódia, não anexa certificado
// nem edita resultado algum — só baixa o que já foi anexado (ver readOnly
// abaixo).
export function SampleResultCard({ sample }: SampleResultCardProps) {
  const queryClient = useQueryClient();
  const [sampleCode, setSampleCode] = useState(sample.sampleCode ?? '');
  const [collectionDate, setCollectionDate] = useState(sample.collectionDate.slice(0, 10));

  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const [pendingDelete, setPendingDelete] = useState(false);

  const saveMetadataMutation = useMutation({
    mutationFn: () =>
      samplesApi.update(sample.id, {
        sampleCode: sampleCode || undefined,
        collectionDate,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['samples'] }),
  });

  // Exclusão é lógica (Sample.active = false) — some de todas as listagens
  // (Resultados, Histórico) mas não apaga certificado/cadeia de custódia já
  // vinculados, pra manter o histórico rastreável se precisar investigar.
  const deleteMutation = useMutation({
    mutationFn: () => samplesApi.deactivate(sample.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['samples'] }),
  });

  // Mesma queryKey usada em CustodyExtractionSection — React Query reaproveita
  // o cache em vez de duplicar a chamada.
  const { data: extractions } = useQuery({
    queryKey: ['custody-extractions', sample.id],
    queryFn: () => custodyExtractionsApi.listBySample(sample.id),
    enabled: !!sample.compoundId && !isClient,
  });
  const approvedExtraction = extractions?.find((extraction) => extraction.status === 'APPROVED');
  const reportNumber = approvedExtraction?.generatedDocumentFilename
    ? reportNumberFromFilename(approvedExtraction.generatedDocumentFilename)
    : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>
            {sample.compoundCode ? `${sample.compoundCode} - ` : ''}
            {sample.compoundName ?? 'Análise'}
            {reportNumber && (
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                Nº {reportNumber}
              </span>
            )}
          </h3>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {sample.samplingPointName ?? 'Ponto não definido'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge">{ANALYSIS_STATUS_LABELS_PT[sample.analysisStatus]}</span>
          {!isClient &&
            (pendingDelete ? (
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>Excluir amostra?</span>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Sim'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  onClick={() => setPendingDelete(false)}
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-danger"
                style={{ padding: '2px 8px', fontSize: 12 }}
                onClick={() => setPendingDelete(true)}
              >
                Excluir amostra
              </button>
            ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label>Código da amostra</label>
          {isClient ? (
            <p style={{ margin: 0 }}>{sample.sampleCode || '-'}</p>
          ) : (
            <input
              className="input"
              value={sampleCode}
              onChange={(e) => setSampleCode(e.target.value)}
              onBlur={() => saveMetadataMutation.mutate()}
            />
          )}
        </div>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label>Data da coleta</label>
          {isClient ? (
            <p style={{ margin: 0 }}>
              {new Date(sample.collectionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </p>
          ) : (
            <input
              type="date"
              className="input"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              onBlur={() => saveMetadataMutation.mutate()}
            />
          )}
        </div>
      </div>

      {!isClient && sample.compoundId && <CustodyExtractionSection sampleId={sample.id} />}

      <div>
        <h4 style={{ marginBottom: 6, fontSize: 14 }}>Certificados</h4>
        <CertificateList sampleId={sample.id} readOnly={isClient} />
        {!isClient && (
          <CertificateExtractionSection sampleId={sample.id} hasCompound={!!sample.compoundId} />
        )}
      </div>

      <div>
        <h4 style={{ marginBottom: 6, fontSize: 14 }}>Resultados analíticos</h4>
        <ResultsTable sampleId={sample.id} initialRows={sample.resultRows} readOnly={isClient} />
      </div>
    </div>
  );
}
