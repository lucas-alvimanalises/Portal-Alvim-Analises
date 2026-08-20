import { redirect } from 'next/navigation';
import { getSession } from '../../lib/auth/server-session';
import { ActiveClientProvider } from '../../lib/auth/ActiveClientContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { LogoutButton } from '../../components/layout/LogoutButton';
import { EmpresaSwitcher } from '../../components/layout/EmpresaSwitcher';
import { BackButton } from '../../components/layout/BackButton';
import { ThemeToggleButton } from '../../components/layout/ThemeToggleButton';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <ActiveClientProvider role={session.role}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar user={session} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 24px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <BackButton />
              <EmpresaSwitcher role={session.role} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ThemeToggleButton />
              <LogoutButton />
            </div>
          </header>
          <main style={{ padding: 24, flex: 1 }}>{children}</main>
        </div>
      </div>
    </ActiveClientProvider>
  );
}
