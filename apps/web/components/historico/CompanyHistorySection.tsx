'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { samplingPointsApi } from '../../lib/api/sampling-points.api';
import { MultiSelect } from '../forms/MultiSelect';
import { HistoricoPontoContent } from './HistoricoPontoContent';

interface CompanyHistorySectionProps {
  clientId: string;
  companyName: string;
  // Período compartilhado, vindo do filtro único da tela de comparação (ver
  // historico/page.tsx) — vale pra todos os pontos de todas as empresas
  // mostradas, em vez de um campo repetido por ponto (confirmado com o
  // usuário).
  startDate: string;
  endDate: string;
}

// Uma empresa inteira do modo de comparação do Histórico. Recolhida por
// padrão (só o nome) — clicar abre um seletor de pontos de amostragem
// (mesmo componente MultiSelect usado no Agendamento de serviço, pra manter
// o mesmo esquema de seleção já conhecido): marcar um ponto já mostra o
// conteúdo dele na hora, desmarcar esconde — sem passo extra de "abrir"
// depois de selecionado. Assim a tela só mostra o que realmente interessa
// no momento (confirmado com o usuário). Múltiplas seções (uma por empresa
// marcada no nível 1) ficam empilhadas na mesma página — nunca mistura
// dado de empresas diferentes, cada uma busca e mostra só os próprios
// pontos/amostras, só ficam visualmente próximas pra comparar.
export function CompanyHistorySection({ clientId, companyName, startDate, endDate }: CompanyHistorySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);

  const { data: samplingPoints } = useQuery({
    queryKey: ['sampling-points', clientId],
    queryFn: () => samplingPointsApi.listByClient(clientId),
    enabled: isOpen,
  });
  const activePoints = (samplingPoints ?? []).filter((p) => p.active);

  return (
    <div className="card" style={{ padding: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        <span>{companyName}</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{isOpen ? '▲' : '▸'}</span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ marginTop: 12, marginBottom: selectedPointIds.length > 0 ? 16 : 0 }}>
            <MultiSelect
              options={activePoints.map((p) => ({ value: p.id, label: p.name }))}
              value={selectedPointIds}
              onChange={setSelectedPointIds}
              placeholder="Selecione os pontos de amostragem..."
              emptyMessage="Nenhum ponto de amostragem cadastrado para esta empresa."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedPointIds.map((pointId) => {
              const point = activePoints.find((p) => p.id === pointId);
              return (
                <div
                  key={pointId}
                  style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 12 }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                    {point?.name ?? 'Ponto'}
                  </div>
                  <HistoricoPontoContent
                    clientId={clientId}
                    pointId={pointId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
