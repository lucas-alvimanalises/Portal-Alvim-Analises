'use client';

import { ScheduleListView } from '../../../components/schedules/ScheduleListView';
import { isScheduleRealized } from '../../../lib/schedule-date';

// Mostra só o que está hoje ou no futuro — o que já passou aparece
// automaticamente em Serviços > Realizados (mesma entidade, só filtrada por
// data, ver ARCHITECTURE.md).
export default function AgendamentosPage() {
  return (
    <ScheduleListView
      title="Agendamento"
      emptyMessage="Nenhum agendamento cadastrado."
      showNewButton
      filter={(schedule) => !isScheduleRealized(schedule)}
    />
  );
}
