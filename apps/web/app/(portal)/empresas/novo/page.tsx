'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateClientPayload } from '@portal-alvim/shared';
import { ClientForm } from '../../../../components/forms/ClientForm';
import { clientsApi } from '../../../../lib/api/clients.api';

export default function NovaEmpresaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateClientPayload) => clientsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      router.push('/empresas');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Nova empresa</h1>
      </div>
      <ClientForm submitLabel="Criar empresa" onSubmit={(data) => mutation.mutateAsync(data)} />
    </div>
  );
}
