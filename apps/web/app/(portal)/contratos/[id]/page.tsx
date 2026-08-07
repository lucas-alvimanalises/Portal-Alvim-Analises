'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateContractPayload } from '@portal-alvim/shared';
import { ContractForm } from '../../../../components/forms/ContractForm';
import { contractsApi } from '../../../../lib/api/contracts.api';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

export default function EditarContratoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', params.id],
    queryFn: () => contractsApi.get(params.id),
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateContractPayload) =>
      contractsApi.update(params.id, {
        name: payload.name,
        description: payload.description,
        startDate: payload.startDate,
        endDate: payload.endDate,
        periodicity: payload.periodicity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      router.push('/contratos');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Editar contrato</h1>
      </div>
      {isLoading || !data ? (
        <TableSkeleton />
      ) : (
        <ContractForm
          defaultValues={data}
          lockClient
          submitLabel="Salvar alterações"
          onSubmit={(formData) => mutation.mutateAsync(formData)}
        />
      )}
    </div>
  );
}
