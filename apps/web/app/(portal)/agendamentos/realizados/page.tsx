'use client';

import { ScheduleListView } from '../../../../components/schedules/ScheduleListView';
import { isScheduleRealized } from '../../../../lib/schedule-date';

// Serviços cuja data agendada já passou. Editáveis normalmente (mesma tela
// de edição de Agendamento) — necessário pra excluir um serviço cadastrado
// errado e pra adicionar amostras extras entregues pelo cliente depois do
// agendamento original (confirmado com o usuário). Se a data for alterada
// para hoje ou futuro, o serviço volta a aparecer em Agendamento
// automaticamente, já que a classificação é só um filtro de data, não um
// campo separado.
export default function RealizadosPage() {
  return (
    <ScheduleListView
      title="Realizados"
      emptyMessage="Nenhum serviço realizado ainda."
      showResultsLink
      filter={(schedule) => isScheduleRealized(schedule)}
      sortOrder="desc"
    />
  );
}
