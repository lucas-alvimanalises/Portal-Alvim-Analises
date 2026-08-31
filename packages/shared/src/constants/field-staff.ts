import { Role } from '../enums';

// Contas de login genéricas/administrativas — têm role TECHNICIAN/ADMIN e
// estão ativas (não dá pra distinguir por nenhum campo do banco), mas nunca
// representam uma pessoa real indo a campo. Aparecem hoje na legenda de
// cores do Calendário e nos seletores de técnico responsável só porque a
// checagem de elegibilidade olhava role+active e nada mais — usuário pediu
// pra tirar (achado real, ver "Administrador Alvim"/"Técnico Alvim" no
// Calendário). Chave por e-mail (mais legível/auditável que o id) — se a
// conta for renomeada ou recriada, precisa atualizar aqui também.
const NON_FIELD_STAFF_EMAILS = new Set(['admin@alvim.com.br', 'tecnico@alvim.com.br']);

// Quem pode ser designado técnico responsável de campo num agendamento —
// Técnico, Gestor e Admin (Gestor/Admin também vão a campo, confirmado com o
// usuário), contas ativas, e fora da lista de logins genéricos acima.
// Mesmo critério usado no seletor de técnico (ScheduleForm/ConfirmDropModal/
// AllocateScheduleModal) e na legenda de cores do Calendário — um só lugar
// pra não duplicar (e desalinhar) esse filtro entre web e mobile.
export function isFieldEligibleStaff(user: { role: Role; active: boolean; email: string }): boolean {
  if (!user.active) return false;
  if (NON_FIELD_STAFF_EMAILS.has(user.email)) return false;
  return user.role === Role.TECHNICIAN || user.role === Role.MANAGER || user.role === Role.ADMIN;
}
