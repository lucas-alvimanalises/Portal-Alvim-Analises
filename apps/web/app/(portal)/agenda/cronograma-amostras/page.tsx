'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { isScheduleRealized } from '../../../../lib/schedule-date';
import { CardGridSkeleton } from '../../../../components/shared/Skeleton';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Cada amostra de Siloxanos consome 80 mL de metanol na preparação — pedido
// do usuário: mostrar isso junto da quantidade de amostras (não só o total
// de amostradores), pra organizar o estoque de metanol sem precisar fazer a
// conta de cabeça. Nenhum outro composto tem esse consumo associado.
const SILOXANOS_CODE = '11000';
const METHANOL_ML_PER_SAMPLE = 80;

function formatMethanolMl(sampleCount: number): string {
  return (sampleCount * METHANOL_ML_PER_SAMPLE).toLocaleString('pt-BR');
}

interface BreakdownItem {
  key: string;
  clientName: string;
  samplingPointName: string;
  quantity: number;
}

interface CompoundSummary {
  compoundId: string;
  code: string;
  name: string;
  total: number;
  breakdown: BreakdownItem[];
}

// Mesmo critério de "ainda não realizado" já usado em Agendamento
// (ScheduleListView) — um serviço só sai da soma quando passa a aparecer em
// Realizados, sem baixa manual nenhuma. Cancelado nunca conta.
function isPending(schedule: ScheduleDto): boolean {
  return schedule.status !== ScheduleStatus.CANCELLED && !isScheduleRealized(schedule);
}

// Data sem horário salva à meia-noite UTC — mesmo padrão usado no resto do
// app (ver ScheduleListView/CalendarioPage) pra não pegar o dia errado no
// fuso do Brasil. Serviço de vários dias (endDate) entra pelo mês da data de
// início — o "mês previsto" de um agendamento é sempre um só.
function scheduleYearMonth(schedule: ScheduleDto): { year: number; month: number } {
  const d = new Date(schedule.scheduledDate);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function buildSummaries(schedules: ScheduleDto[], year: number, month: number): CompoundSummary[] {
  const byCompound = new Map<string, CompoundSummary>();

  for (const schedule of schedules) {
    if (!isPending(schedule)) continue;
    const ym = scheduleYearMonth(schedule);
    if (ym.year !== year || ym.month !== month) continue;

    for (const point of schedule.samplingPoints) {
      for (const compound of point.compounds) {
        let summary = byCompound.get(compound.id);
        if (!summary) {
          summary = { compoundId: compound.id, code: compound.code, name: compound.name, total: 0, breakdown: [] };
          byCompound.set(compound.id, summary);
        }
        summary.total += compound.quantity;

        const breakdownKey = `${schedule.clientId}|${point.samplingPointId}`;
        let item = summary.breakdown.find((b) => b.key === breakdownKey);
        if (!item) {
          item = {
            key: breakdownKey,
            clientName: schedule.clientName ?? '-',
            samplingPointName: point.samplingPointName ?? '-',
            quantity: 0,
          };
          summary.breakdown.push(item);
        }
        item.quantity += compound.quantity;
      }
    }
  }

  return Array.from(byCompound.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((summary) => ({
      ...summary,
      breakdown: summary.breakdown.sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR')),
    }));
}

// Cartão no mesmo espírito visual dos cards de "Ação Necessária" do
// Dashboard (número grande em destaque) — expansível pra mostrar de qual
// empresa/ponto vem cada amostra, pra quem quiser rastrear a origem do total.
function CompoundCard({ summary }: { summary: CompoundSummary }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ flex: 1, minWidth: 220 }}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {summary.code} - {summary.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{summary.total}</span>
            {summary.code === SILOXANOS_CODE && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                ≈ {formatMethanolMl(summary.total)} mL metanol
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
          {summary.breakdown.map((item) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 13,
                padding: '4px 0',
              }}
            >
              <span>
                {item.clientName} <span style={{ color: 'var(--color-text-muted)' }}>· {item.samplingPointName}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <strong>{item.quantity}</strong>
                {summary.code === SILOXANOS_CODE && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    ({formatMethanolMl(item.quantity)} mL)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Quadro de planejamento pra saber quantos amostradores de cada tipo pedir
// ao laboratório — soma "Qtd. amostras" (ScheduleSamplingPointCompound.
// quantity) entre todos os agendamentos ainda não realizados do mês
// selecionado, agrupado por composto, entre todas as empresas/pontos (o que
// importa aqui é o total físico a providenciar, não a origem). Reaproveita
// GET /schedules (mesma fonte já usada no Calendário) — sem endpoint novo,
// sem alterar nenhum dado existente (tela só lê e soma).
export default function CronogramaAmostrasPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesApi.list(),
  });

  function changeMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }

  const summaries = schedules ? buildSummaries(schedules, cursor.year, cursor.month) : [];

  return (
    <div>
      <div className="page-header">
        <h1>Cronograma de Amostras</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={() => changeMonth(-1)}>
          ‹ Anterior
        </button>
        <strong style={{ fontSize: 16 }}>
          {MONTH_LABELS[cursor.month]} de {cursor.year}
        </strong>
        <button type="button" className="btn btn-secondary" onClick={() => changeMonth(1)}>
          Próximo ›
        </button>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : summaries.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Nenhuma amostra prevista para este mês.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {summaries.map((summary) => (
            <CompoundCard key={summary.compoundId} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
