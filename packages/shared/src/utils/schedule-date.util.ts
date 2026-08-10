// Datas de agendamento são salvas como meia-noite UTC representando um dia de
// calendário puro (sem hora). "Hoje" é calculado a partir do relógio local do
// dispositivo (navegador web ou celular) e convertido pro mesmo formato, para
// comparar dia com dia de forma consistente com o resto do app.
function todayAsUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

// Um agendamento com data exata confirmada é "realizado" quando chega o dia
// do serviço (hoje ou antes) — só datas estritamente futuras continuam em
// "Agendamento" (ver ARCHITECTURE.md).
//
// Quando a data ainda não foi confirmada (só o mês é conhecido, sempre salvo
// como dia 1 — ver formatPeriodo em ScheduleListView), esse dia 1 não pode
// ser usado pra essa comparação: isso jogaria o agendamento pra "Realizados"
// assim que o mês começasse, mesmo faltando semanas pro técnico ir a campo.
// Nesse caso o agendamento só é "realizado" quando o mês de referência
// inteiro já passou (confirmado com o usuário) — o técnico ainda não foi,
// mas não faz sentido continuar esperando uma data que nunca chegou.
//
// Compartilhado entre web e mobile (ver apps/web/lib/schedule-date.ts, que
// reexporta daqui) — a mesma regra decide o que aparece em Agendamento vs.
// Realizados nos dois apps.
export function isScheduleRealized(schedule: { scheduledDate: string; dateConfirmed: boolean }): boolean {
  const scheduled = new Date(schedule.scheduledDate);
  if (schedule.dateConfirmed) {
    return scheduled.getTime() <= todayAsUtcMidnight();
  }
  const now = new Date();
  const scheduledMonthStart = Date.UTC(scheduled.getUTCFullYear(), scheduled.getUTCMonth(), 1);
  const currentMonthStart = Date.UTC(now.getFullYear(), now.getMonth(), 1);
  return scheduledMonthStart < currentMonthStart;
}
