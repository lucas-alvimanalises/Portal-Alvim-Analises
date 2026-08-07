'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateContractPayload } from '@portal-alvim/shared';
import { ContractForm } from '../../../../components/forms/ContractForm';
import { contractsApi } from '../../../../lib/api/contracts.api';

export default function NovoContratoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateContractPayload) => contractsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      router.push('/contratos');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Novo contrato</h1>
      </div>
      <ContractForm submitLabel="Criar contrato" onSubmit={(data) => mutation.mutateAsync(data)} />
    </div>
  );
}
