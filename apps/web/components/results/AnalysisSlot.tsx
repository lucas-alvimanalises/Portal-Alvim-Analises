'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ANALYSIS_STATUS_LABELS_PT, SampleDto } from '@portal-alvim/shared';
import { samplesApi } from '../../lib/api/samples.api';
import { custodyExtractionsApi } from '../../lib/api/custody-extractions.api';
import { SampleResultCard } from './SampleResultCard';

interface AnalysisSlotProps {
  clientId: string;
  scheduleId: string;
  samplingPointId: string;
  compoundId: string;
  compoundLabel: string;
  slotNumber: number;
  totalSlots: number;
  sample?: SampleDto;
  defaultCollectionDate: string;
  scheduledDate: string;
  endDate: string | null;
  dateConfirmed: boolean;
  // Checkbox de seleção pro download em lote (cadeia de custódia/
  // certificado) — só faz sentido quando já existe amostra (ver
  // ResultadosAnaliticosPage).
  selected?: boolean;
  onToggleSelect?: () => void;
}

// Um "slot" representa uma amostra esperada (ponto + composto + posição,
// ex.: "2ª amostra de Siloxanos") — vem da estrutura já configurada no
// agendamento (ScheduleSamplingPointCompound.quantity), não da lista de
// Sample já criadas. Fechado por padrão; abrir revela o formulário de criar
// a amostra (se ainda não existir) ou o card completo de análise.
export function AnalysisSlot({
  clientId,
  scheduleId,
  samplingPointId,
  compoundId,
  compoundLabel,
  slotNumber,
  totalSlots,
  sample,
  defaultCollectionDate,
  scheduledDate,
  endDate,
  dateConfirmed,
  selected,
  onToggleSelect,
}: AnalysisSlotProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [collectionDate, setCollectionDate] = useState(defaultCollectionDate);
  const [sampleCode, setSampleCode] = useState('');
  const [custodyFile, setCustodyFile] = useState<File | null>(null);
  const custodyFileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const sample = await samplesApi.create({
        clientId,
        scheduleId,
        samplingPointId,
        compoundId,
        collectionDate,
        sampleCode: sampleCode || undefined,
      });
      // Anexa uma cadeia de custódia já pronta (feita fora da plataforma)
      // direto como documento final da amostra — sem IA, sem revisão, só
      // guarda o arquivo (confirmado com o usuário). Precisa passar pelo
      // mesmo fluxo de custody-extractions (não custody-documents direto)
      // pra criar também a CustodyExtraction aprovada que o status derivado
      // do agendamento reconhece (ver ScheduleDerivedStatusService).
      if (custodyFile) {
        await custodyExtractionsApi.attachExisting(sample.id, custodyFile);
      }
      return sample;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples', 'schedule', scheduleId] });
      setCustodyFile(null);
      if (custodyFileInputRef.current) custodyFileInputRef.current.value = '';
    },
  });

  const label = totalSlots > 1 ? `${compoundLabel} — Amostra ${slotNumber} de ${totalSlots}` : compoundLabel;

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {sample && onToggleSelect && (
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelect}
              aria-label={`Selecionar ${label} para download`}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 14,
          }}
        >
          <span>{label}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {sample ? (
              <span className="badge">{ANALYSIS_STATUS_LABELS_PT[sample.analysisStatus]}</span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Não iniciada</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
          </span>
        </button>
      </div>

      {isOpen && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--color-border)' }}>
          {sample ? (
            <div style={{ marginTop: 12 }}>
              <SampleResultCard
                sample={sample}
                scheduledDate={scheduledDate}
                endDate={endDate}
                dateConfirmed={dateConfirmed}
              />
            </div>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                Ainda não há amostra registrada para esta análise. Preencha os dados abaixo para
                começar.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: 1, minWidth: 140 }}>
                  <label>Data da coleta</label>
                  <input
                    type="date"
                    className="input"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                  />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 140 }}>
                  <label>Código da amostra (opcional)</label>
                  <input
                    className="input"
                    value={sampleCode}
                    onChange={(e) => setSampleCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label>Anexar cadeia de custódia já existente (opcional)</label>
                <input
                  ref={custodyFileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setCustodyFile(e.target.files?.[0] ?? null)}
                />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Use quando a cadeia de custódia já foi feita fora da plataforma — o arquivo é
                  anexado direto como documento final, sem passar pela leitura por IA.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Criando...' : 'Criar amostra'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
