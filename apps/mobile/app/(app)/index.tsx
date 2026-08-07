import { Redirect } from 'expo-router';
import { Role } from '@portal-alvim/shared';
import { useAuth } from '../../lib/auth/AuthContext';

// Tela de entrada do grupo (app): redireciona para a tela certa de acordo
// com o papel do usuário logado.
export default function AppIndex() {
  const { user } = useAuth();

  if (user?.role === Role.TECHNICIAN) {
    return <Redirect href="/meus-agendamentos" />;
  }
  if (user?.role === Role.CLIENT) {
    return <Redirect href="/meus-servicos" />;
  }
  return <Redirect href="/perfil" />;
}
