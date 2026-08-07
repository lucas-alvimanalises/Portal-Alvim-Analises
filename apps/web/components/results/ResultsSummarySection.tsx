'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { serviceResultsSummaryApi } from '../../lib/api/service-results-summary.api';
import { ResultsSummaryModal } from './ResultsSummaryModal';

interface ResultsSummaryButtonProps {
  scheduleId: string;
}

// Botão da barra de ações — fica junto de "Relatório de Campo"/"Fotos do
// Serviço". A lista de versões (ResultsSummaryHistory) é renderizada à
// parte, fora da barra de botões, pra não quebrar aquele layout em linha.
export function ResultsSummaryButton({ scheduleId }: ResultsSummaryButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Mesma queryKey de ResultsSummaryHistory — React Query reaproveita o
  // cache em vez de duplicar a chamada.
  const { data: versions } = useQuery({
    queryKey: ['results-summary', 'versions', scheduleId],
    queryFn: () => serviceResultsSummaryApi.listVersions(scheduleId),
  });

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setShowModal(true)}>
        {versions && versions.length > 0 ? 'Gerar Nova Versão do Resumo' : 'Gerar Resumo de Resultados'}
      </button>
      {showModal && <ResultsSummaryModal scheduleId={scheduleId} onClose={() => setShowModal(false)} />}
    </>
  );
}

interface ResultsSummaryHistoryProps {
  scheduleId: string;
}

// Histórico de PDFs já gerados pro serviço — mesmo espírito do histórico de
// versões do Reporte ANP. Fica escondido (não renderiza nada) enquanto não
// existir nenhuma versão ainda, pra não ocupar espaço à toa.
export function ResultsSummaryHistory({ scheduleId }: ResultsSummaryHistoryProps) {
  const { data: versions } = useQuery({
    queryKey: ['results-summary', 'versions', scheduleId],
    queryFn: () => serviceResultsSummaryApi.listVersions(scheduleId),
  });

  if (!versions || versions.length === 0) return null;

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 12px', fontSize: 15 }}>Resumo de Resultados — histórico</h2>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {versions.map((version, index) => (
          <div
            key={version.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
              fontSize: 13,
            }}
          >
            <div>
              <div>
                <strong>v{version.version}</strong> · gerado por {version.generatedByName} em{' '}
                {new Date(version.createdAt).toLocaleString('pt-BR')}
              </div>
              {version.comment && (
                <div style={{ color: 'var(--color-text-muted)', marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  {version.comment}
                </div>
              )}
            </div>
            <a
              href={serviceResultsSummaryApi.fileUrl(version.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
            >
              Baixar
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
