'use client';

// Nota: a lista de itens/roles do menu vem de NAV_ITEMS em
// packages/shared/src/constants/role-permissions.ts. Um diff só nesse
// pacote não é suficiente pra Railway rebuildar o serviço web sozinho (o
// watch path dele é escopado a apps/web) — qualquer mudança em NAV_ITEMS
// precisa vir acompanhada de um toque real aqui, ou o front continua
// servindo o bundle antigo mesmo com o deploy "concluído".
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CircleCheckBig,
  CircleUserRound,
  Clock,
  FileChartColumn,
  FileClock,
  FileText,
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  Package,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { AuthenticatedUser, NAV_ITEMS, NavItem, ROLE_LABELS_PT, Role } from '@portal-alvim/shared';

const PROFILE_LINK_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT];

// Um único set de ícones (lucide-react) pra todo o menu, mapeado pelo label
// de NAV_ITEMS — mantido aqui (não no pacote shared) porque é puramente
// apresentação web; o mobile futuro escolhe seus próprios ícones nativos.
const NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  'Manutenção da Planta': Wrench,
  'Reportes Mensais ANP': FileChartColumn,
  Usuários: Users,
  Empresas: Building2,
  Contratos: FileText,
  'Cadeia de Custódia': Package,
  'Certificados Pendentes': FileClock,
  Serviços: ClipboardList,
  Agendamento: CalendarPlus,
  Realizados: CircleCheckBig,
  Histórico: Clock,
  Agenda: CalendarDays,
  Calendário: Calendar,
  'Organizar Serviço': ListChecks,
};

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href && pathname.startsWith(item.href)) return true;
  return item.children?.some((child) => isItemActive(child, pathname)) ?? false;
}

export function Sidebar({ user }: { user: AuthenticatedUser }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  // Grupo já vem aberto quando uma de suas rotas filhas está ativa.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.children) initial[item.label] = isItemActive(item, pathname);
    });
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  }

  return (
    <aside
      style={{
        width: 220,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <img src="/logo.jpg" alt="Alvim Análises" style={{ width: '100%', maxWidth: 160, height: 'auto' }} />
        <div style={{ fontWeight: 700, fontSize: 13, textAlign: 'center' }}>Portal Alvim Análises</div>
      </div>
      {items.map((item) => {
        if (item.children) {
          const children = item.children.filter((child) => child.roles.includes(user.role));
          const open = openGroups[item.label] ?? false;
          const groupActive = isItemActive(item, pathname);

          const GroupIcon = NAV_ICONS[item.label];

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: groupActive ? 600 : 400,
                  color: groupActive ? 'var(--color-primary)' : 'var(--color-text)',
                  background: groupActive ? 'var(--color-primary-soft)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {GroupIcon && <GroupIcon size={17} strokeWidth={2} />}
                  {item.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {open ? '▲' : '▼'}
                </span>
              </button>
              {open && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    marginLeft: 10,
                    borderLeft: '2px solid var(--color-border)',
                    paddingLeft: 8,
                    marginTop: 2,
                  }}
                >
                  {children.map((child) => {
                    const active = child.href ? pathname.startsWith(child.href) : false;
                    const ChildIcon = NAV_ICONS[child.label];
                    return (
                      <Link
                        key={child.href}
                        href={child.href ?? '#'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13,
                          fontWeight: active ? 600 : 400,
                          background: active ? 'var(--color-primary-soft)' : 'transparent',
                          color: active ? 'var(--color-primary)' : 'var(--color-text)',
                          textDecoration: 'none',
                          transition: 'background-color 0.15s ease, color 0.15s ease',
                        }}
                      >
                        {ChildIcon && <ChildIcon size={15} strokeWidth={2} />}
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const active = item.href ? pathname.startsWith(item.href) : false;
        const ItemIcon = NAV_ICONS[item.label];
        return (
          <Link
            key={item.href}
            href={item.href ?? '#'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              background: active ? 'var(--color-primary-soft)' : 'transparent',
              color: active ? 'var(--color-primary)' : 'var(--color-text)',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            {ItemIcon && <ItemIcon size={17} strokeWidth={2} />}
            {item.label}
          </Link>
        );
      })}
      <div style={{ marginTop: 'auto', fontSize: 12 }}>
        {PROFILE_LINK_ROLES.includes(user.role) ? (
          <Link
            href="/perfil"
            title="Meu Perfil"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
            }}
          >
            <CircleUserRound size={20} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span>
              <span style={{ display: 'block', color: 'var(--color-text)', fontWeight: 600 }}>
                {user.name}
              </span>
              {ROLE_LABELS_PT[user.role]}
            </span>
          </Link>
        ) : (
          <div style={{ padding: '8px 10px', color: 'var(--color-text-muted)' }}>
            {user.name}
            <br />
            {ROLE_LABELS_PT[user.role]}
          </div>
        )}
      </div>
    </aside>
  );
}
