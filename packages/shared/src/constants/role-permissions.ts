import { Role } from '../enums';

// Fonte única de verdade para navegação/visibilidade por papel — usada no web e,
// futuramente, no mobile. Regras de autorização "de verdade" (o que é permitido
// de fato) vivem nos Guards do backend; isto aqui só controla o que a UI mostra.
export interface NavItem {
  label: string;
  // Ausente quando o item é só um grupo (tem `children` e não navega sozinho).
  href?: string;
  roles: Role[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  // Cliente vê uma versão diferente desta mesma tela (resumo dos PRÓPRIOS
  // serviços por status, não o resumo global de Admin/Gestor — ver
  // DashboardPage no web, confirmado com o usuário). Técnico vê a mesma
  // versão de Admin/Gestor (confirmado com o usuário: acesso a todo o menu
  // menos Usuários e Contratos).
  { label: 'Dashboard', href: '/dashboard', roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT] },
  // Histórico de manutenções que o próprio cliente faz na planta — Cliente
  // cadastra/consulta as próprias; ADMIN/MANAGER/TECHNICIAN veem de todas as
  // empresas.
  {
    label: 'Manutenção da Planta',
    href: '/manutencao',
    roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT],
  },
  {
    label: 'Reportes Mensais ANP',
    href: '/reportes-anp',
    roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT],
  },
  { label: 'Usuários', href: '/usuarios', roles: [Role.ADMIN] },
  { label: 'Empresas', href: '/empresas', roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN] },
  // Cliente ainda não vê Contratos: tela em construção (confirmado com o
  // usuário) — volta a ficar visível pra CLIENT quando a funcionalidade for
  // concluída. Técnico também não vê Contratos (exceção explícita do
  // usuário ao pedido de acesso total).
  { label: 'Contratos', href: '/contratos', roles: [Role.ADMIN, Role.MANAGER] },
  // Repositório de PDFs de cadeia de custódia por composto/ano — sem escopo
  // de cliente (ver CustodyDocument no schema), por isso nunca visível pra
  // CLIENT (perderia a proteção por empresa).
  { label: 'Cadeia de Custódia', href: '/amostras', roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN] },
  // Consolida, de todos os serviços do sistema, as amostras/análises ainda
  // sem certificado anexado — Técnico entra porque já pode anexar
  // certificado hoje na tela de resultados de um serviço (confirmado com o
  // usuário); Cliente nunca vê (peça de trabalho interna Alvim).
  { label: 'Certificados Pendentes', href: '/certificados-pendentes', roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN] },
  {
    label: 'Serviços',
    roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT],
    children: [
      // Agendamento (futuro/hoje) e Realizados (passado) são a mesma entidade
      // Schedule, só filtradas por data — ver ARCHITECTURE.md.
      {
        label: 'Agendamento',
        href: '/agendamentos',
        roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT],
      },
      {
        label: 'Realizados',
        href: '/agendamentos/realizados',
        roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT],
      },
      // Navegação por empresa > ponto de amostragem > composto do histórico
      // de amostras já realizadas — cruza empresas diferentes na mesma tela
      // (igual Cadeia de Custódia), por isso restrito a ADMIN/MANAGER/
      // TECHNICIAN (nunca CLIENT via essa visão cross-empresa). Cliente
      // entra direto no nível 2 (pontos de amostragem da própria empresa
      // ativa) — o nível 1 (lista de TODAS as empresas) é só pra quem navega
      // entre clientes; o Cliente já escolhe a empresa no seletor do topo
      // (ver historico/page.tsx).
      {
        label: 'Histórico',
        href: '/historico',
        roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT],
      },
    ],
  },
  {
    label: 'Agenda',
    // Grupo em si visível a Técnico também (por causa de "Organizar
    // Serviço" abaixo) — os filhos é que decidem o que cada papel vê.
    roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN],
    children: [
      // Ferramenta de despacho/alocação (data exata + técnico) — Técnico
      // agora também visualiza (confirmado com o usuário: acesso a todo o
      // menu menos Usuários e Contratos), mas continua sem se auto-alocar
      // (as ações de arrastar/confirmar seguem restritas a ADMIN/MANAGER no
      // backend, ver plant-maintenances/schedules controllers).
      { label: 'Calendário', href: '/agenda/calendario', roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN] },
      // Imprimir cadeias de custódia/etiquetas e preencher checklist de campo
      // de um serviço já agendado — Técnico participa (é quem geralmente
      // imprime/preenche em campo).
      {
        label: 'Organizar Serviço',
        href: '/agenda/organizar-servico',
        roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN],
      },
    ],
  },
];

function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => (item.children ? flattenNavItems(item.children) : [item]));
}

export function canAccessRoute(role: Role, href: string): boolean {
  const item = flattenNavItems(NAV_ITEMS).find((i) => i.href && href.startsWith(i.href));
  return item ? item.roles.includes(role) : true;
}

// Primeira rota do menu que o papel realmente acessa — usada como destino de
// redirecionamento pós-login e de "sem permissão". Nunca hardcodar '/dashboard'
// para isso: Técnico e Cliente não têm acesso a ele (ver NAV_ITEMS acima).
export function getDefaultRouteForRole(role: Role): string {
  const item = flattenNavItems(NAV_ITEMS).find((i) => i.roles.includes(role));
  return item?.href ?? '/agendamentos';
}

export const ROLE_LABELS_PT: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.MANAGER]: 'Gestor',
  [Role.TECHNICIAN]: 'Técnico',
  [Role.CLIENT]: 'Cliente',
};
