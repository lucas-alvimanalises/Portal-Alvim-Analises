import { isScheduleRealized, ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';

const MONTH_LABELS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Agregações reaproveitadas pela Home e pelos hubs das abas Agenda/Serviços
// (mesmos números, só exibidos em lugares diferentes) — mantidas num só
// lugar pra não recalcular (e arriscar divergir) em cada tela.

// "Serviços abertos": ainda não realizados e não cancelados — mesmo
// critério de servicos/agendamento.tsx.
export function getOpenSchedules(schedules: ScheduleDto[]): ScheduleDto[] {
  return schedules.filter((s) => s.status !== ScheduleStatus.CANCELLED && !isScheduleRealized(s));
}

// Próximo serviço: o mais próximo entre os abertos.
export function getNextSchedule(schedules: ScheduleDto[]): ScheduleDto | null {
  const open = [...getOpenSchedules(schedules)].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate),
  );
  return open[0] ?? null;
}

export function countSchedulesWithoutTechnician(schedules: ScheduleDto[]): number {
  return getOpenSchedules(schedules).filter((s) => s.technicians.length === 0).length;
}

// Mesma lógica de agenda/cronograma-amostras.tsx: soma a quantidade de
// amostras (todos os compostos) entre os serviços abertos do mês corrente.
export function countSamplesThisMonth(schedules: ScheduleDto[], now: Date = new Date()): number {
  let total = 0;
  for (const schedule of getOpenSchedules(schedules)) {
    const d = new Date(schedule.scheduledDate);
    if (d.getUTCFullYear() !== now.getFullYear() || d.getUTCMonth() !== now.getMonth()) continue;
    for (const point of schedule.samplingPoints) {
      for (const compound of point.compounds) {
        total += compound.quantity;
      }
    }
  }
  return total;
}

export function getCurrentMonthLabelPt(now: Date = new Date()): string {
  return MONTH_LABELS_PT[now.getMonth()];
}

// "Hoje" / "Amanhã" / data curta — usado no pill do card de Próximo Serviço.
// scheduledDate não tem horário (só dia), então o pill nunca mostra hora.
export function formatScheduleDatePill(schedule: ScheduleDto): string {
  if (!schedule.dateConfirmed) {
    return new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    });
  }
  const date = new Date(schedule.scheduledDate);
  const todayUtc = new Date();
  const todayMidnight = Date.UTC(todayUtc.getFullYear(), todayUtc.getMonth(), todayUtc.getDate());
  const diffDays = Math.round((date.getTime() - todayMidnight) / 86_400_000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatScheduleSubtitle(schedule: ScheduleDto): string {
  const compounds = Array.from(
    new Set(schedule.samplingPoints.flatMap((p) => p.compounds.map((c) => c.name))),
  ).join(', ');
  const pointsCount = schedule.samplingPoints.length;
  const pointsLabel = `${pointsCount} ${pointsCount === 1 ? 'ponto de amostragem' : 'pontos de amostragem'}`;
  const techLabel =
    schedule.technicians.length > 0
      ? `Téc. ${schedule.technicians.map((t) => t.name).join(', ')}`
      : 'Sem técnico definido';
  return [compounds || null, pointsLabel, techLabel].filter(Boolean).join(' · ');
}
