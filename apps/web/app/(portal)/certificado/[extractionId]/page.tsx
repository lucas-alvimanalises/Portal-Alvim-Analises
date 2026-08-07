'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CertificateExtractedData } from '@portal-alvim/shared';
import { certificateExtractionsApi } from '../../../../lib/api/certificate-extractions.api';
import { certificatesApi } from '../../../../lib/api/certificates.api';
import { ApiError } from '../../../../lib/api/client';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

const LOW_CONFIDENCE_THRESHOLD = 0.7;

function emptyData(): CertificateExtractedData {
  return {
    certificateNumber: '',
    certificateNumberConfidence: 1,
    laboratory: '',
    laboratoryConfidence: 1,
    analysisDate: '',
    analysisDateConfidence: 1,
    issueDate: '',
    issueDateConfidence: 1,
    results: [],
  };
}

// Tela de conferência da leitura de certificado por IA: mostra o PDF/foto
// original ao lado dos campos lidos (destacados quando a confiança é
// baixa), permite corrigir, e só cria o Certificate oficial + mescla os
// resultados na amostra depois de aprovado — mesmo padrão da tela de
// conferência de cadeia de custódia.
export default function CertificadoRevisaoPage() {
  const params = useParams<{ extractionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [data, setData] = useState<CertificateExtractedData | null>(null);

  const { data: extraction, isLoading } = useQuery({
    queryKey: ['certificate-extraction', params.extractionId],
    queryFn: () => certificateExtractionsApi.get(params.extractionId),
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 2000 : false),
  });

  useEffect(() => {
    if (!extraction || data) return;
    const source = extraction.correctedData ?? extraction.extractedData;
    if (!source) return;
    setData(source);
  }, [extraction, data]);

  const saveMutation = useMutation({
    mutationFn: (payload: CertificateExtractedData) =>
      certificateExtractionsApi.updateCorrections(params.extractionId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['certificate-extraction', params.extractionId] }),
  });

  const approveMutation = useMutation({
    mutationFn: () => certificateExtractionsApi.approve(params.extractionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-extraction', params.extractionId] });
      queryClient.invalidateQueries({ queryKey: ['certificate-extractions', extraction?.sampleId] });
      queryClient.invalidateQueries({ queryKey: ['certificates', extraction?.sampleId] });
      // Resultados lidos são mesclados na tabela da amostra na aprovação
      // (ver ApproveCertificateExtractionUseCase) — atualiza a tela de
      // Resultados pra refletir isso ao voltar.
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });

  function currentData(): CertificateExtractedData {
    return data ?? emptyData();
  }

  function setField<K extends keyof CertificateExtractedData>(key: K, value: CertificateExtractedData[K]) {
    setData((current) => ({ ...(current ?? emptyData()), [key]: value }));
  }

  function setResultValue(key: string, patch: { result?: string; unit?: string }) {
    setData((current) => {
      const base = current ?? emptyData();
      const existingIndex = base.results.findIndex((row) => row.key === key);
      if (existingIndex === -1) return base;
      const nextResults = [...base.results];
      nextResults[existingIndex] = { ...nextResults[existingIndex], ...patch };
      return { ...base, results: nextResults };
    });
  }

  if (isLoading || !extraction) {
    return <TableSkeleton />;
  }

  const current = currentData();
  const isReadOnly = extraction.status === 'APPROVED';

  return (
    <div>
      <div className="page-header">
        <h1>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Amostra
          </button>{' '}
          / Conferência do Certificado — {extraction.compoundName}
        </h1>
      </div>

      {extraction.status === 'PROCESSING' && (
        <div className="card">
          <p style={{ margin: 0 }}>A IA está lendo o certificado enviado, aguarde...</p>
        </div>
      )}

      {extraction.status === 'FAILED' && (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>
            Falha na leitura: {extraction.errorMessage ?? 'erro desconhecido.'}
          </p>
        </div>
      )}

      {extraction.status === 'APPROVED' && extraction.generatedCertificateId && (
        <div className="card">
          <p style={{ marginTop: 0 }}>Certificado já aprovado e cadastrado.</p>
          <a
            className="btn btn-primary"
            href={certificatesApi.downloadUrl(extraction.generatedCertificateId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver certificado
          </a>
        </div>
      )}

      {(extraction.status === 'NEEDS_REVIEW' || extraction.status === 'APPROVED') && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {extraction.originalScanFilename.toLowerCase().endsWith('.pdf') ? (
              <embed
                src={certificateExtractionsApi.scanUrl(extraction.id)}
                type="application/pdf"
                style={{ width: '100%', height: '80vh', border: 'none' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={certificateExtractionsApi.scanUrl(extraction.id)}
                alt="Certificado original"
                style={{ width: '100%', display: 'block' }}
              />
            )}
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>Nº do certificado</label>
              <input
                type="text"
                className="input"
                value={current.certificateNumber}
                onChange={(e) => setField('certificateNumber', e.target.value)}
                style={
                  current.certificateNumberConfidence < LOW_CONFIDENCE_THRESHOLD
                    ? { borderColor: '#e0a800', background: '#fff8e1' }
                    : undefined
                }
                disabled={isReadOnly}
              />
            </div>
            <div className="field">
              <label>Laboratório</label>
              <input
                type="text"
                className="input"
                value={current.laboratory}
                onChange={(e) => setField('laboratory', e.target.value)}
                style={
                  current.laboratoryConfidence < LOW_CONFIDENCE_THRESHOLD
                    ? { borderColor: '#e0a800', background: '#fff8e1' }
                    : undefined
                }
                disabled={isReadOnly}
              />
            </div>
            <div className="field">
              <label>Data da análise</label>
              <input
                type="date"
                className="input"
                value={current.analysisDate}
                onChange={(e) => setField('analysisDate', e.target.value)}
                style={
                  current.analysisDateConfidence < LOW_CONFIDENCE_THRESHOLD
                    ? { borderColor: '#e0a800', background: '#fff8e1' }
                    : undefined
                }
                disabled={isReadOnly}
              />
            </div>
            <div className="field">
              <label>Data de emissão</label>
              <input
                type="date"
                className="input"
                value={current.issueDate}
                onChange={(e) => setField('issueDate', e.target.value)}
                style={
                  current.issueDateConfidence < LOW_CONFIDENCE_THRESHOLD
                    ? { borderColor: '#e0a800', background: '#fff8e1' }
                    : undefined
                }
                disabled={isReadOnly}
              />
            </div>

            <div>
              <h4 style={{ fontSize: 14, marginBottom: 6 }}>Resultados monitorados</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {extraction.analytes.map((analyte) => {
                  const row = current.results.find((r) => r.key === analyte.key);
                  const lowConfidence = (row?.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD;
                  return (
                    <div key={analyte.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div className="field" style={{ flex: 2, marginBottom: 0 }}>
                        <label>{analyte.label}</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Resultado"
                          value={row?.result ?? ''}
                          onChange={(e) => setResultValue(analyte.key, { result: e.target.value })}
                          style={lowConfidence ? { borderColor: '#e0a800', background: '#fff8e1' } : undefined}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Unidade</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Unidade"
                          value={row?.unit ?? ''}
                          onChange={(e) => setResultValue(analyte.key, { unit: e.target.value })}
                          style={lowConfidence ? { borderColor: '#e0a800', background: '#fff8e1' } : undefined}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {extraction.status === 'NEEDS_REVIEW' && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => saveMutation.mutate(currentData())}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar rascunho'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    await saveMutation.mutateAsync(currentData());
                    approveMutation.mutate();
                  }}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Aprovando...' : 'Aprovar certificado'}
                </button>
              </div>
            )}

            {approveMutation.isError && (
              <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>
                {approveMutation.error instanceof ApiError
                  ? approveMutation.error.message
                  : 'Não foi possível aprovar.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
