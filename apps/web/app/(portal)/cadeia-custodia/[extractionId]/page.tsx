'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CustodyExtractedData, CustodyExtractedValue } from '@portal-alvim/shared';
import { custodyExtractionsApi } from '../../../../lib/api/custody-extractions.api';
import { custodyDocumentsApi } from '../../../../lib/api/custody-documents.api';
import { servicePhotosApi } from '../../../../lib/api/service-photos.api';
import { ApiError } from '../../../../lib/api/client';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

const LOW_CONFIDENCE_THRESHOLD = 0.7;

function emptyValue(): CustodyExtractedValue {
  return { value: '', confidence: 1 };
}

// Tela de conferência da digitalização inteligente: mostra o escaneado
// original ao lado dos campos lidos pela IA (destacados quando a confiança
// é baixa), permite corrigir, e só gera o PDF oficial depois de aprovado.
export default function CadeiaDeCustodiaRevisaoPage() {
  const params = useParams<{ extractionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Record<string, CustodyExtractedValue> | null>(null);
  const [table, setTable] = useState<Record<string, Record<string, CustodyExtractedValue>> | null>(
    null,
  );

  const { data: extraction, isLoading } = useQuery({
    queryKey: ['custody-extraction', params.extractionId],
    queryFn: () => custodyExtractionsApi.get(params.extractionId),
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 2000 : false),
  });

  useEffect(() => {
    if (!extraction || fields || table) return;
    const source = extraction.correctedData ?? extraction.extractedData;
    if (!source) return;
    setFields(source.fields);
    setTable(source.table);
  }, [extraction, fields, table]);

  const saveMutation = useMutation({
    mutationFn: (data: CustodyExtractedData) => custodyExtractionsApi.updateCorrections(params.extractionId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custody-extraction', params.extractionId] }),
  });

  const approveMutation = useMutation({
    mutationFn: () => custodyExtractionsApi.approve(params.extractionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-extraction', params.extractionId] });
      queryClient.invalidateQueries({ queryKey: ['custody-extractions', extraction?.sampleId] });
      // O PDF gerado aqui vira um CustodyDocument na pasta do composto/ano —
      // invalida sem compoundId específico pra atualizar qualquer pasta já
      // carregada (ver /amostras/composto/[compoundId]/ano/[year]).
      queryClient.invalidateQueries({ queryKey: ['custody-documents'] });
      // Código da amostra e Data da coleta são atualizados automaticamente
      // na aprovação (ver ApproveCustodyExtractionUseCase) — atualiza a
      // tela de Resultados pra refletir isso ao voltar.
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });

  const { data: servicePhotos } = useQuery({
    queryKey: ['service-photos', extraction?.scheduleId],
    queryFn: () => servicePhotosApi.list(extraction!.scheduleId),
    enabled: !!extraction?.scheduleId,
  });

  const selectPhotoMutation = useMutation({
    mutationFn: (photoId: string | null) => custodyExtractionsApi.selectPhoto(params.extractionId, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custody-extraction', params.extractionId] }),
  });

  function currentData(): CustodyExtractedData {
    return { fields: fields ?? {}, table: table ?? {} };
  }

  function setFieldValue(key: string, value: string) {
    setFields((current) => ({ ...(current ?? {}), [key]: { value, confidence: 1 } }));
  }

  function setTableValue(column: string, row: string, value: string) {
    setTable((current) => ({
      ...(current ?? {}),
      [column]: { ...(current?.[column] ?? {}), [row]: { value, confidence: 1 } },
    }));
  }

  if (isLoading || !extraction) {
    return <TableSkeleton />;
  }

  const schema = extraction.templateSchema;

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
          / Conferência da Cadeia de Custódia — {extraction.compoundName}
        </h1>
      </div>

      {extraction.status === 'PROCESSING' && (
        <div className="card">
          <p style={{ margin: 0 }}>A IA está lendo o formulário enviado, aguarde...</p>
        </div>
      )}

      {extraction.status === 'FAILED' && (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>
            Falha na leitura: {extraction.errorMessage ?? 'erro desconhecido.'}
          </p>
        </div>
      )}

      {extraction.status === 'APPROVED' && extraction.generatedDocumentId && (
        <div className="card">
          <p style={{ marginTop: 0 }}>Cadeia de custódia já aprovada e gerada.</p>
          <a
            className="btn btn-primary"
            href={custodyDocumentsApi.viewUrl(extraction.generatedDocumentId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver PDF gerado
          </a>
        </div>
      )}

      {(extraction.status === 'NEEDS_REVIEW' || extraction.status === 'APPROVED') && fields && table && (
        <div
          style={
            extraction.originalScanFilename
              ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }
              : { display: 'grid', gridTemplateColumns: '1fr', gap: 20, maxWidth: 700 }
          }
        >
          {extraction.originalScanFilename && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {extraction.originalScanFilename.toLowerCase().endsWith('.pdf') ? (
                <embed
                  src={custodyExtractionsApi.scanUrl(extraction.id)}
                  type="application/pdf"
                  style={{ width: '100%', height: '80vh', border: 'none' }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={custodyExtractionsApi.scanUrl(extraction.id)}
                  alt="Cadeia de custódia original"
                  style={{ width: '100%', display: 'block' }}
                />
              )}
            </div>
          )}

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {schema.fields.map((field) => {
              // Campos fixos (Metodologia, Procedimento Interno, ...) e o
              // número de relatório não são lidos pela IA nem editáveis
              // aqui — o valor certo é aplicado automaticamente na aprovação.
              if (field.fixedValue !== undefined || field.systemGenerated) {
                const isSignatureField = field.key === schema.signatureFieldKey;
                return (
                  <div className="field" key={field.key}>
                    <label>{field.label}</label>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {field.systemGenerated
                        ? 'Atribuído automaticamente na aprovação'
                        : isSignatureField
                          ? 'Assinatura digital de quem aprovar será inserida automaticamente'
                          : field.fixedValue || '—'}
                    </p>
                  </div>
                );
              }

              const current = fields[field.key] ?? emptyValue();
              const lowConfidence = current.confidence < LOW_CONFIDENCE_THRESHOLD;
              return (
                <div className="field" key={field.key}>
                  <label>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={2}
                      value={current.value}
                      onChange={(e) => setFieldValue(field.key, e.target.value)}
                      style={lowConfidence ? { borderColor: '#e0a800', background: '#fff8e1' } : undefined}
                      disabled={extraction.status === 'APPROVED'}
                    />
                  ) : (
                    <input
                      type={field.type === 'date' || field.type === 'time' ? field.type : 'text'}
                      className="input"
                      value={current.value}
                      onChange={(e) => setFieldValue(field.key, e.target.value)}
                      style={lowConfidence ? { borderColor: '#e0a800', background: '#fff8e1' } : undefined}
                      disabled={extraction.status === 'APPROVED'}
                    />
                  )}
                </div>
              );
            })}

            {schema.table.rows.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, marginBottom: 6 }}>Tabela de amostragem</h4>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th />
                      {schema.table.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schema.table.rows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ fontWeight: 600 }}>{row.label}</td>
                        {schema.table.columns.map((column) => {
                          const current = table[column]?.[row.key] ?? emptyValue();
                          const lowConfidence = current.confidence < LOW_CONFIDENCE_THRESHOLD;
                          return (
                            <td key={column}>
                              <input
                                className="input"
                                value={current.value}
                                onChange={(e) => setTableValue(column, row.key, e.target.value)}
                                style={lowConfidence ? { borderColor: '#e0a800', background: '#fff8e1' } : undefined}
                                disabled={extraction.status === 'APPROVED'}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            <div>
              <h4 style={{ fontSize: 14, marginBottom: 6 }}>Foto (opcional)</h4>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 0 }}>
                Entra no PDF gerado, abaixo de Observações. Envie fotos primeiro em
                &quot;Fotos do Serviço&quot;, na tela de Resultados.
              </p>
              {!servicePhotos || servicePhotos.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Nenhuma foto do serviço disponível ainda.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {servicePhotos.map((photo) => {
                    const selected = extraction.selectedPhotoId === photo.id;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() =>
                          selectPhotoMutation.mutate(selected ? null : photo.id)
                        }
                        disabled={extraction.status === 'APPROVED' || selectPhotoMutation.isPending}
                        style={{
                          padding: 0,
                          border: selected
                            ? '3px solid var(--color-primary)'
                            : '1px solid var(--color-border)',
                          borderRadius: 6,
                          cursor: extraction.status === 'APPROVED' ? 'default' : 'pointer',
                          overflow: 'hidden',
                          background: 'none',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={servicePhotosApi.fileUrl(photo.id)}
                          alt={photo.filename}
                          style={{ width: 100, height: 80, objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
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
                  {approveMutation.isPending ? 'Gerando PDF...' : 'Aprovar e gerar PDF'}
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
