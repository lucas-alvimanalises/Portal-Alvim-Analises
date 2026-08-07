'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users.api';

// Sessão (getSession()) só existe no server — componentes client que
// precisam saber o papel de quem está vendo a tela (pra esconder/travar
// campos por papel) usam isto em vez disso.
export function useCurrentUser() {
  return useQuery({ queryKey: ['users', 'me'], queryFn: () => usersApi.me() });
}
