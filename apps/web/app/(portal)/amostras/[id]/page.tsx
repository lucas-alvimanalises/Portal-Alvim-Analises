'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateSamplePayload } from '@portal-alvim/shared';
import { SampleForm } from '../../../../components/forms/SampleForm';
import { samplesApi } from '../../../../lib/api/samples.api';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

export default function EditarAmostraPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['samples', params.id],
    queryFn: () => samplesApi.get(params.id),
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateSamplePayload) =>
      samplesApi.update(params.id, {
        samplingPointId: payload.samplingPointId,
        compoundId: payload.compoundId,
        collectionDate: payload.collectionDate,
        collectionLocation: payload.collectionLocation,
        responsibleUserId: payload.responsibleUserId,
        notes: payload.notes,
        sampleCode: payload.sampleCode,
        analysisStatus: payload.analysisStatus,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      router.push(updated.compoundId ? `/amostras/composto/${updated.compoundId}` : '/amostras');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Editar amostra</h1>
      </div>
      {isLoading || !data ? (
        <TableSkeleton />
      ) : (
        <SampleForm
          defaultValues={data}
          lockSchedule
          submitLabel="Salvar alterações"
          onSubmit={(formData) => mutation.mutateAsync(formData)}
        />
      )}
    </div>
  );
}
