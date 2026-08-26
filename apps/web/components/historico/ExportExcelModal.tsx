'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { compoundsApi } from '../../lib/api/compounds.api';
import { samplingPointsApi } from '../../lib/api/sampling-points.api';
import { samplesApi } from '../../lib/api/samples.api';
import { MultiSelect } from '../forms/MultiSelect';
import { DateInput } from '../shared/DateInput';

interface ExportExcelModalProps {
  clientId: string;
  // Pré-marca um ponto (chamado a partir da tela de um ponto específico,
  // nível 3) — continua deixando escolher outros pontos também, não trava
  // num ponto só (mesmo componente serve os dois lugares de acesso).
  initialSamplingPointId?: string;
  onClose: () => void;
}

// Exportação em Excel do Histórico — mesmo filtro (pontos/compostos/período)
// disponível tanto na lista de pontos da empresa quanto dentro de um ponto
// específico. Sem selecionar nada em pontos/compostos = exporta tudo
// (mesmo critério do backend, ver ExportSamplesExcelUseCase).
export function ExportExcelModal({ clientId, initialSamplingPointId, onClose }: ExportExcelModalProps) {
  const [samplingPointIds, setSamplingPointIds] = useState<string[]>(
    initialSamplingPointId ? [initialSamplingPointId] : [],
  );
  const [compoundIds, setCompoundIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: samplingPoints } = useQuery({
    queryKey: ['sampling-points', clientId],
    queryFn: () => samplingPointsApi.listByClient(clientId),
  });
  const { data: compounds } = useQuery({
    queryKey: ['compounds'],
    queryFn: compoundsApi.list,
  });

  const pointOptions = (samplingPoints ?? [])
    .filter((p) => p.active)
    .map((p) => ({ value: p.id, label: p.name }));
  const compoundOptions = (compounds ?? [])
    .filter((c) => c.active)
    .map((c) => ({ value: c.id, label: c.name }));

  function handleDownload() {
    const url = samplesApi.exportExcelUrl({ clientId, samplingPointIds, compoundIds, startDate, endDate });
    window.open(url, '_blank');
    onClose();
  }

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
      }}
    >
      <div className="card" style={{ width: 460, maxWidth: '90vw' }}>
        <h3 style={{ marginTop: 0 }}>Baixar Excel do Histórico</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: -8 }}>
          Deixe um filtro vazio pra incluir todos.
        </p>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Pontos de amostragem</label>
          <MultiSelect
            options={pointOptions}
            value={samplingPointIds}
            onChange={setSamplingPointIds}
            placeholder="Todos os pontos"
            emptyMessage="Nenhum ponto cadastrado."
          />
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Compostos/contaminantes</label>
          <MultiSelect
            options={compoundOptions}
            value={compoundIds}
            onChange={setCompoundIds}
            placeholder="Todos os compostos"
            emptyMessage="Nenhum composto cadastrado."
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>De</label>
            <DateInput value={startDate} onChange={setStartDate} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Até</label>
            <DateInput value={endDate} onChange={setEndDate} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleDownload}>
            Baixar Excel
          </button>
        </div>
      </div>
    </div>
  );
}
