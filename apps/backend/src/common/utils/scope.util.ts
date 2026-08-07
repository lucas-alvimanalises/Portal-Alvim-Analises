import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';

/**
 * Resolve qual empresa (clientId) deve escopar a requisição de um usuário
 * CLIENT, que pode ter acesso a várias. `requestedClientId` vem do query
 * param `?clientId=` (seletor de empresa no portal): se informado, precisa
 * estar em `user.clientIds`; se omitido, usa a primeira empresa do usuário
 * como padrão (mantém endpoints funcionando mesmo sem o seletor).
 */
export function resolveActiveClientId(
  user: AuthenticatedUser,
  requestedClientId?: string,
): string {
  if (requestedClientId) {
    if (!user.clientIds.includes(requestedClientId)) {
      throw new ForbiddenException('Você não tem acesso a essa empresa.');
    }
    return requestedClientId;
  }

  if (user.clientIds.length === 0) {
    throw new ForbiddenException('Seu usuário não está vinculado a nenhuma empresa.');
  }

  return user.clientIds[0];
}

/**
 * Aplica o escopo de propriedade (ownership) de Cliente a um filtro Prisma
 * `where`, na camada de aplicação (use-case), e não via middleware global do
 * Prisma. Decisão registrada em ARCHITECTURE.md: manter o ponto de escopo
 * visível em cada use-case é mais simples de testar e evita reescrever
 * queries de forma implícita.
 *
 * ADMIN, MANAGER e TECHNICIAN não sofrem restrição (retornam o `where`
 * original) — Técnico tem acesso a todos os agendamentos/amostras, não só
 * aos que ele mesmo está alocado (confirmado com o usuário: mesmo nível de
 * acesso de Admin/Gestor em todo o menu, ver especificação de permissões).
 * Os parâmetros `technicianField`/`technicianRelationField` ficam mantidos
 * na assinatura só por compatibilidade — nenhum use-case deve mais restringir
 * por técnico responsável.
 */
export function applyOwnershipScope<W extends Record<string, unknown>>(
  where: W,
  user: AuthenticatedUser,
  options: {
    clientField?: string;
    technicianField?: string;
    // Para relações N:N (ex.: Schedule.technicians): filtra via Prisma
    // `{ some: { technicianId: user.id } }` em vez de igualdade direta.
    technicianRelationField?: string;
    requestedClientId?: string;
  } = {},
): W {
  const clientField = options.clientField ?? 'clientId';

  if (user.role === Role.CLIENT) {
    const activeClientId = resolveActiveClientId(user, options.requestedClientId);
    return { ...where, [clientField]: activeClientId };
  }

  return where;
}

/**
 * Para endpoints de recurso único (GET/PATCH/:id): busca já feita, aqui só
 * valida se o usuário tem permissão de ver/alterar aquele registro específico.
 * Para CLIENT, basta o recurso pertencer a QUALQUER uma das empresas do
 * usuário (não precisa ser a "empresa ativa" do seletor).
 *
 * ADMIN, MANAGER e TECHNICIAN nunca são bloqueados aqui — Técnico enxerga
 * qualquer agendamento, não só os que ele mesmo está alocado (confirmado com
 * o usuário). `resource.technicianIds` fica na assinatura só por
 * compatibilidade com quem ainda passa esse campo; não tem mais efeito.
 */
export function assertOwnership(
  user: AuthenticatedUser,
  resource: { clientId?: string | null; technicianIds?: string[] },
): void {
  if (user.role === Role.ADMIN || user.role === Role.MANAGER || user.role === Role.TECHNICIAN) {
    return;
  }

  if (
    user.role === Role.CLIENT &&
    (!resource.clientId || !user.clientIds.includes(resource.clientId))
  ) {
    throw new ForbiddenException('Este recurso não pertence às suas empresas.');
  }
}
