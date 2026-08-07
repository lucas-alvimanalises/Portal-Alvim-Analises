'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreatePlantMaintenancePayload, MaintenanceStatus, Role } from '@portal-alvim/shared';
import { PlantMaintenanceForm } from '../../../../../components/plant-maintenance/PlantMaintenanceForm';
import { PlantMaintenanceAttachments } from '../../../../../components/plant-maintenance/PlantMaintenanceAttachments';
import { plantMaintenancesApi } from '../../../../../lib/api/plant-maintenances.api';
import { ApiError } from '../../../../../lib/api/client';
import { useCurrentUser } from '../../../../../lib/auth/useCurrentUser';
import { TableSkeleton } from '../../../../../components/shared/Skeleton';

export default function EditarManutencaoPage() {
  const params = useParams<{ clientId: string; maintenanceId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const [pendingDelete, setPendingDelete] = useState(false);

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ['plant-maintenance', params.maintenanceId],
    queryFn: () => plantMaintenancesApi.get(params.maintenanceId),
  });

  // Mesma regra do backend (assertClientCanModify) e da listagem
  // ([clientId]/page.tsx): CLIENT não exclui uma manutenção já concluída/
  // cancelada — sem isso, o botão "Excluir" aqui ficava sempre visível e só
  // falhava (403) ao confirmar.
  const canDelete =
    !!maintenance &&
    (me?.role !== Role.CLIENT ||
      (maintenance.status !== MaintenanceStatus.COMPLETED &&
        maintenance.status !== MaintenanceStatus.CANCELLED));

  const mutation = useMutation({
    mutationFn: (payload: CreatePlantMaintenancePayload) => {
      const { clientId: _clientId, ...update } = payload;
      return plantMaintenancesApi.update(params.maintenanceId, update);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['plant-maintenances', params.clientId] });
      queryClient.setQueryData(['plant-maintenance', params.maintenanceId], updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => plantMaintenancesApi.remove(params.maintenanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-maintenances', params.clientId] });
      router.push(`/manutencao/${params.clientId}`);
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link
            href={`/manutencao/${params.clientId}`}
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            Manutenção da Planta
          </Link>{' '}
          / Editar
        </h1>
        {canDelete && !pendingDelete && (
          <button type="button" className="btn btn-danger" onClick={() => setPendingDelete(true)}>
            Excluir
          </button>
        )}
        {pendingDelete && (
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>Confirmar exclusão?</span>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPendingDelete(false)}>
              Cancelar
            </button>
          </span>
        )}
      </div>

      {mutation.isError && (
        <p style={{ color: 'var(--color-danger)', marginTop: -12 }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Não foi possível salvar as alterações.'}
        </p>
      )}
      {mutation.isSuccess && (
        <p style={{ color: 'var(--color-primary)', marginTop: -12, fontSize: 13 }}>✓ Alterações salvas</p>
      )}

      {isLoading || !maintenance ? (
        <TableSkeleton />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PlantMaintenanceForm
            clientId={params.clientId}
            defaultValues={maintenance}
            submitLabel="Salvar alterações"
            onSubmit={(payload) => mutation.mutateAsync(payload)}
          />
          <PlantMaintenanceAttachments maintenance={maintenance} />
        </div>
      )}
    </div>
  );
}
