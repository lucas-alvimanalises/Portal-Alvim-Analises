'use client';

import { Fragment, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceResultsSummaryApi } from '../../lib/api/service-results-summary.api';
import { ApiError } from '../../lib/api/client';
import { ComplianceStatusIndicator, getComplianceRowStyle } from '../shared/ComplianceStatusIndicator';

// O indicador de situação (bolinha + texto) e o destaque de linha vêm do
// componente compartilhado ComplianceStatusIndicator — mesmo padrão visual
// usado em Resultados e Reportes ANP (ver especificação de consistência
// visual). No PDF gerado (jsPDF) o indicador continua sendo um círculo
// vetorial desenhado à parte (ver results-summary-pdf.util.ts
// drawStatusIndicator), já que aquele contexto não reaproveita componentes
// React — resultado visual equivalente, só a técnica de renderização muda.

// O texto de "result" às vezes já vem com a unidade embutida (ex.: "< 0,0075
// mg Cl/m3") — evita duplicar a unidade na exibição (mesma checagem do
// backend, ver formatResult em results-summary-pdf.util.ts).
function formatResult(result: string, unit: string): string {
  return unit && !result.includes(unit) ? `${result} ${unit}` : result;
}

interface ResultsSummaryModalProps {
  scheduleId: string;
  onClose: () => void;
}

// Pré-visualização somente leitura (dados já lançados em cada amostra, sem
// digitar nada de novo aqui — ver spec) + campo de comentário livre. Ao
// salvar, gera e persiste uma nova versão do PDF (nunca sobrescreve a
// anterior).
export function ResultsSummaryModal({ scheduleId, onClose }: ResultsSummaryModalProps) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);

  const { data: preview, isLoading } = useQuery({
    queryKey: ['results-summary', 'preview', scheduleId],
    queryFn: () => serviceResultsSummaryApi.getPreview(scheduleId),
  });

  // Só assume o comentário salvo como ponto de partida antes do usuário
  // mexer no campo — evita sobrescrever o que ele já digitou se a query
  // revalidar no meio da edição.
  useEffect(() => {
    if (preview && !touched) setComment(preview.latestComment ?? '');
  }, [preview, touched]);

  const generateMutation = useMutation({
    mutationFn: () => serviceResultsSummaryApi.generate(scheduleId, { comment }),
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['results-summary', 'versions', scheduleId] });
      window.open(serviceResultsSummaryApi.fileUrl(summary.id), '_blank');
      onClose();
    },
  });

  const rows = preview?.rows ?? [];
  const barreiraComparison = preview?.barreiraComparison ?? null;
  let lastPoint: string | null = null;
  let lastCategory: string | null = null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div className="card" style={{ width: 760, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Gerar Resumo de Resultados</h3>

        {isLoading || !preview ? (
          <p style={{ fontSize: 13 }}>Carregando resumo...</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, marginBottom: 16 }}>
              <span>
                <strong>Empresa:</strong> {preview.clientName}
              </span>
              <span>
                <strong>Período:</strong> {preview.formattedPeriod}
              </span>
              <span>
                <strong>Pontos:</strong>{' '}
                {preview.samplingPointNames.length > 0 ? preview.samplingPointNames.join(', ') : '-'}
              </span>
            </div>

            {barreiraComparison && barreiraComparison.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>1ª Barreira → 2ª Barreira</h4>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Composto', '1ª Barreira', '2ª Barreira', 'Variação'].map((h) => (
                          <th
                            key={h}
                            style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {barreiraComparison.map((c) => (
                        <tr key={c.parameterName}>
                          <td style={{ padding: '6px 10px' }}>{c.parameterName}</td>
                          <td style={{ padding: '6px 10px' }}>{c.firstBarreiraValue}</td>
                          <td style={{ padding: '6px 10px' }}>{c.secondBarreiraValue}</td>
                          <td style={{ padding: '6px 10px' }}>{c.variationLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Parâmetro', 'Resultado', 'Limite', 'Situação'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 10, color: 'var(--color-text-muted)' }}>
                        Nenhum resultado lançado ainda para este serviço.
                      </td>
                    </tr>
                  )}
                  {rows.map((row, index) => {
                    const showPointHeader = row.samplingPointName !== lastPoint;
                    if (showPointHeader) lastCategory = null;
                    const showCategoryHeader = row.category !== lastCategory;
                    lastPoint = row.samplingPointName;
                    lastCategory = row.category;
                    return (
                      <Fragment key={index}>
                        {showPointHeader && (
                          <tr>
                            <td
                              colSpan={4}
                              style={{
                                padding: '8px 10px',
                                background: 'var(--color-surface-muted, #f1f5f9)',
                                fontWeight: 600,
                              }}
                            >
                              {row.samplingPointName}
                            </td>
                          </tr>
                        )}
                        {showCategoryHeader && (
                          <tr>
                            <td
                              colSpan={4}
                              style={{
                                padding: '5px 10px',
                                background: 'var(--color-surface-subtle, #f8fafc)',
                                color: 'var(--color-text-muted)',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {row.category}
                            </td>
                          </tr>
                        )}
                        <tr style={getComplianceRowStyle(row.compliance)}>
                          <td style={{ padding: '6px 10px' }}>{row.parameterName}</td>
                          <td style={{ padding: '6px 10px' }}>{formatResult(row.result, row.unit)}</td>
                          <td style={{ padding: '6px 10px' }}>{row.specLimit ?? ''}</td>
                          <td style={{ padding: '6px 10px' }}>
                            {row.compliance ? <ComplianceStatusIndicator compliance={row.compliance} /> : ''}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label>Comentários sobre os resultados</label>
              <textarea
                className="input"
                rows={4}
                value={comment}
                onChange={(e) => {
                  setTouched(true);
                  setComment(e.target.value);
                }}
                placeholder="Análise/observação da equipe Alvim sobre os resultados deste serviço..."
              />
            </div>

            {generateMutation.isError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>
                {generateMutation.error instanceof ApiError
                  ? generateMutation.error.message
                  : 'Não foi possível gerar o resumo.'}
              </p>
            )}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isLoading}
          >
            {generateMutation.isPending ? 'Gerando...' : 'Salvar e gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
