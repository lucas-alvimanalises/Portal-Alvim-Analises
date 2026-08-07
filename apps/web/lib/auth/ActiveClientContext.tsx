'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClientDto, Role } from '@portal-alvim/shared';
import { clientsApi } from '../api/clients.api';

const STORAGE_KEY = 'portal_alvim_active_client_id';

interface ActiveClientContextValue {
  companies: ClientDto[];
  activeClientId: string | null;
  setActiveClientId: (id: string) => void;
  isLoading: boolean;
}

const ActiveClientContext = createContext<ActiveClientContextValue | undefined>(undefined);

// Só busca/expõe empresas para o papel CLIENT — Admin/Gestor/Técnico não têm
// "empresa ativa" (enxergam tudo ou só os próprios agendamentos).
export function ActiveClientProvider({ role, children }: { role: Role; children: ReactNode }) {
  const enabled = role === Role.CLIENT;
  const { data, isLoading } = useQuery({
    queryKey: ['my-clients'],
    queryFn: clientsApi.mine,
    enabled,
  });
  const companies = data ?? [];
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const companyIdsKey = companies.map((c) => c.id).join(',');

  useEffect(() => {
    if (!enabled || companies.length === 0) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored && companies.some((c) => c.id === stored) ? stored : companies[0].id;
    setActiveClientIdState(initial);
    // companies muda de referência a cada fetch; comparamos pelos ids (companyIdsKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, companyIdsKey]);

  function setActiveClientId(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveClientIdState(id);
  }

  return (
    <ActiveClientContext.Provider
      value={{ companies, activeClientId, setActiveClientId, isLoading }}
    >
      {children}
    </ActiveClientContext.Provider>
  );
}

export function useActiveClient() {
  const ctx = useContext(ActiveClientContext);
  if (!ctx) {
    throw new Error('useActiveClient deve ser usado dentro de um ActiveClientProvider.');
  }
  return ctx;
}
