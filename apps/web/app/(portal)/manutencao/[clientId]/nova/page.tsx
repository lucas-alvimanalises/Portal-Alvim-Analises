'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreatePlantMaintenancePayload } from '@portal-alvim/shared';
import { PlantMaintenanceForm } from '../../../../../components/plant-maintenance/PlantMaintenanceForm';
import { plantMaintenancesApi } from '../../../../../lib/api/plant-maintenances.api';
import { ApiError } from '../../../../../lib/api/client';

export default function NovaManutencaoPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreatePlantMaintenancePayload) => plantMaintenancesApi.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['plant-maintenances', params.clientId] });
      // Vai direto pra edição: é lá que dá pra anexar arquivos (precisa do
      // id já existir).
      router.push(`/manutencao/${params.clientId}/${created.id}`);
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Nova Manutenção</h1>
      </div>
      {mutation.isError && (
        <p style={{ color: 'var(--color-danger)', marginTop: -12 }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Não foi possível salvar a manutenção.'}
        </p>
      )}
      <PlantMaintenanceForm
        clientId={params.clientId}
        submitLabel="Criar manutenção"
        onSubmit={(payload) => mutation.mutateAsync(payload)}
      />
    </div>
  );
}
