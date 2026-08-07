'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role, SampleDto } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../../lib/api/schedules.api';
import { samplesApi } from '../../../../../lib/api/samples.api';
import { fieldReportsApi } from '../../../../../lib/api/field-reports.api';
import { useCurrentUser } from '../../../../../lib/auth/useCurrentUser';
import { AnalysisSlot } from '../../../../../components/results/AnalysisSlot';
import { SampleResultCard } from '../../../../../components/results/SampleResultCard';
import { ServicePhotosSection } from '../../../../../components/results/ServicePhotosSection';
import { ScheduleCommentsSection } from '../../../../../components/results/ScheduleCommentsSection';
import { BulkDownloadButton } from '../../../../../components/results/BulkDownloadButton';
import { FieldReportModal } from '../../../../../components/results/FieldReportModal';
import { ResultsSummaryButton, ResultsSummaryHistory } from '../../../../../components/results/ResultsSummarySection';
import { TableSkeleton } from '../../../../../components/shared/Skeleton';

// Agrupa as amostras existentes por ponto+composto, ordenadas por criação —
// a i-ésima amostra criada para aquele par vira o "slot" i (1ª amostra de
// Siloxanos, 2ª amostra de Siloxanos, ...).
// timeZone UTC: datas sem horário são salvas à meia-noite UTC; sem isso,
// exibiriam o dia anterior no fuso do Brasil (mesmo padrão de ScheduleListView.tsx).
function formatPeriod(scheduledDate: string, endDate: string | null) {
  const start = new Date(scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  if (!endDate || endDate === scheduledDate) return start;
  const end = new Date(endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  return `${start} a ${end}`;
}

function groupSamplesBySlot(samples: SampleDto[]) {
  const sorted = [...samples].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const map = new Map<string, SampleDto[]>();
  for (const sample of sorted) {
    if (!sample.samplingPointId || !sample.compoundId) continue;
    const key = `${sample.samplingPointId}|${sample.compoundId}`;
    const list = map.get(key) ?? [];
    list.push(sample);
    map.set(key, list);
  }
  return map;
}

export default function ResultadosAnaliticosPage() {
  const params = useParams<{ id: string }>();
  const { data: me } = useCurrentUser();
  const canManageFieldReport = me?.role === Role.ADMIN || me?.role === Role.MANAGER;
  const [showPhotos, setShowPhotos] = useState(false);
  const [showFieldReportModal, setShowFieldReportModal] = useState(false);
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());

  // null = ainda não foi gerado — o cliente não vê nada de relatório de
  // campo antes disso (confirmado com o usuário); a equipe Alvim vê sempre
  // o botão de gerar/regenerar, independente do estado.
  const { data: fieldReport } = useQuery({
    queryKey: ['field-report', params.id],
    queryFn: () => fieldReportsApi.get(params.id),
  });

  function toggleSampleSelection(sampleId: string) {
    setSelectedSampleIds((current) => {
      const next = new Set(current);
      if (next.has(sampleId)) next.delete(sampleId);
      else next.add(sampleId);
      return next;
    });
  }

  const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['schedules', params.id],
    queryFn: () => schedulesApi.get(params.id),
  });

  const { data: samples, isLoading: isLoadingSamples } = useQuery({
    queryKey: ['samples', 'schedule', params.id],
    queryFn: () => samplesApi.list({ scheduleId: params.id }),
  });

  const isLoading = isLoadingSchedule || isLoadingSamples;
  const activeSamples = samples?.filter((sample) => sample.active) ?? [];
  const samplesBySlot = groupSamplesBySlot(activeSamples);

  // Amostras que não correspondem a nenhum ponto/composto configurado no
  // agendamento (ex.: cadastradas fora do fluxo de slots) — mostradas à parte
  // pra não sumir da tela.
  const matchedSampleIds = new Set<string>();
  schedule?.samplingPoints.forEach((point) => {
    point.compounds.forEach((compound) => {
      const key = `${point.samplingPointId}|${compound.id}`;
      (samplesBySlot.get(key) ?? []).forEach((sample) => matchedSampleIds.add(sample.id));
    });
  });
  const unmatchedSamples = activeSamples.filter((sample) => !matchedSampleIds.has(sample.id));

  const hasAnySample = activeSamples.length > 0;
  const hasAnySlotConfigured = (schedule?.samplingPoints.length ?? 0) > 0;

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link
            href={`/agendamentos/${params.id}`}
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            {schedule?.clientName ?? 'Agendamento'}
          </Link>
          {schedule && (
            <>
              {' / '}
              {schedule.serviceTypeName ?? '-'}
              {' / '}
              {formatPeriod(schedule.scheduledDate, schedule.endDate)}
            </>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Equipe Alvim: sempre pode gerar/regenerar. Cliente: só vê o
              botão de baixar, e só depois que algum colaborador já gerou
              (fieldReport null = nada aparece, per pedido do usuário). */}
          {canManageFieldReport ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!schedule || schedule.derivedStatus === 'AGUARDANDO_INFORMACOES'}
              title={
                schedule?.derivedStatus === 'AGUARDANDO_INFORMACOES'
                  ? 'Cadastre todas as cadeias de custódia deste serviço antes de gerar o relatório de campo.'
                  : undefined
              }
              onClick={() => setShowFieldReportModal(true)}
            >
              {fieldReport ? 'Gerar Nova Versão do Relatório' : 'Relatório de Campo'}
            </button>
          ) : (
            fieldReport && (
              <a
                href={fieldReportsApi.fileUrl(params.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Relatório de Campo
              </a>
            )
          )}
          {/* Ferramenta interna Alvim, sem perna nenhuma pro cliente nesta
              primeira etapa (envio ao cliente é manual, por fora do portal —
              ver spec) — nem aparece pra CLIENT/TECHNICIAN. */}
          {canManageFieldReport && <ResultsSummaryButton scheduleId={params.id} />}
          <BulkDownloadButton selectedSampleIds={Array.from(selectedSampleIds)} />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPhotos((current) => !current)}
          >
            Fotos do Serviço
          </button>
        </div>
      </div>

      {showFieldReportModal && (
        <FieldReportModal
          scheduleId={params.id}
          isRegenerate={!!fieldReport}
          onClose={() => setShowFieldReportModal(false)}
        />
      )}

      {showPhotos && (
        <div style={{ marginBottom: 20 }}>
          <ServicePhotosSection scheduleId={params.id} />
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!hasAnySample && (
            <div className="card">
              <p style={{ margin: 0 }}>
                Nenhuma análise iniciada ainda para este agendamento.
              </p>
            </div>
          )}

          {!hasAnySlotConfigured && !hasAnySample && (
            <p style={{ color: 'var(--color-text-muted)' }}>
              Este agendamento não tem pontos de amostragem/compostos configurados. Edite o
              agendamento pra definir a estrutura, ou cadastre uma análise avulsa em
              &quot;Nova análise&quot;.
            </p>
          )}

          {schedule?.samplingPoints.map((point) => (
            <div key={point.samplingPointId}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>{point.samplingPointName}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {point.compounds.map((compound) => {
                  const key = `${point.samplingPointId}|${compound.id}`;
                  const existing = samplesBySlot.get(key) ?? [];
                  const totalSlots = Math.max(compound.quantity, existing.length);
                  return Array.from({ length: totalSlots }, (_, index) => (
                    <AnalysisSlot
                      key={`${key}-${index}`}
                      clientId={schedule.clientId}
                      scheduleId={schedule.id}
                      samplingPointId={point.samplingPointId}
                      compoundId={compound.id}
                      compoundLabel={`${compound.code} - ${compound.name}`}
                      slotNumber={index + 1}
                      totalSlots={totalSlots}
                      sample={existing[index]}
                      defaultCollectionDate={schedule.scheduledDate.slice(0, 10)}
                      selected={existing[index] ? selectedSampleIds.has(existing[index].id) : false}
                      onToggleSelect={
                        existing[index] ? () => toggleSampleSelection(existing[index].id) : undefined
                      }
                    />
                  ));
                })}
              </div>
            </div>
          ))}

          {unmatchedSamples.length > 0 && (
            <div>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Outras análises</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {unmatchedSamples.map((sample) => (
                  <SampleResultCard key={sample.id} sample={sample} />
                ))}
              </div>
            </div>
          )}

          {canManageFieldReport && <ResultsSummaryHistory scheduleId={params.id} />}

          {schedule && (
            <ScheduleCommentsSection
              scheduleId={schedule.id}
              internalComments={schedule.internalComments}
              clientComments={schedule.clientComments}
              clientResponse={schedule.clientResponse}
            />
          )}
        </div>
      )}
    </div>
  );
}
