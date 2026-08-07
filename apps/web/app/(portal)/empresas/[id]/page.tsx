'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateClientPayload } from '@portal-alvim/shared';
import { ClientForm } from '../../../../components/forms/ClientForm';
import { SamplingPointsManager } from '../../../../components/forms/SamplingPointsManager';
import { clientsApi } from '../../../../lib/api/clients.api';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

export default function EditarEmpresaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clients', params.id],
    queryFn: () => clientsApi.get(params.id),
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateClientPayload) => clientsApi.update(params.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      router.push('/empresas');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Editar empresa</h1>
      </div>
      {isLoading || !data ? (
        <TableSkeleton />
      ) : (
        <>
          <ClientForm
            defaultValues={data}
            submitLabel="Salvar alterações"
            onSubmit={(formData) => mutation.mutateAsync(formData)}
          />
          <SamplingPointsManager clientId={params.id} />
        </>
      )}
    </div>
  );
}
