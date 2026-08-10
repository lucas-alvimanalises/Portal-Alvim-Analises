// Movido pro pacote compartilhado (web e mobile precisam da mesma regra pra
// decidir Agendamento vs. Realizados) — reexporta daqui pra não precisar
// tocar em todo import existente no app web. Implementação real em
// packages/shared/src/utils/schedule-date.util.ts.
export { isScheduleRealized } from '@portal-alvim/shared';
