import { redirect } from 'next/navigation';
import { getDefaultRouteForRole } from '@portal-alvim/shared';
import { getSession } from '../lib/auth/server-session';

export default function RootPage() {
  const session = getSession();
  redirect(session ? getDefaultRouteForRole(session.role) : '/login');
}
