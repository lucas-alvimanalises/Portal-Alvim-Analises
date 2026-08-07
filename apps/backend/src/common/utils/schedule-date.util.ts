// Mesmo critério usado no web (apps/web/lib/schedule-date.ts): um
// agendamento com data confirmada é "realizado" quando chega o dia do
// serviço (hoje ou antes). scheduledDate é sempre meia-noite UTC
// representando um dia de calendário puro, então "hoje" também é calculado
// em UTC aqui — evita depender do fuso do processo Node, que pode não ser o
// do Brasil.
//
// Quando a data ainda não foi confirmada (só o mês é conhecido, sempre salvo
// como dia 1), esse dia 1 não pode ser usado pra essa comparação: isso
// jogaria o agendamento pra "realizado" assim que o mês começasse, mesmo
// faltando semanas pro técnico ir a campo. Nesse caso só conta como
// "realizado" quando o mês de referência inteiro já passou (confirmado com
// o usuário).
export function isScheduleRealized(schedule: { scheduledDate: Date; dateConfirmed: boolean }): boolean {
  const now = new Date();
  if (schedule.dateConfirmed) {
    const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return schedule.scheduledDate.getTime() <= todayUtcMidnight;
  }
  const scheduledMonthStart = Date.UTC(schedule.scheduledDate.getUTCFullYear(), schedule.scheduledDate.getUTCMonth(), 1);
  const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return scheduledMonthStart < currentMonthStart;
}
