'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateSamplePayload } from '@portal-alvim/shared';
import { SampleForm } from '../../../../components/forms/SampleForm';
import { samplesApi } from '../../../../lib/api/samples.api';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

function NovaAmostraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // Pré-seleciona o composto quando o cadastro veio de dentro de uma "pasta".
  const compoundId = searchParams.get('compoundId') ?? undefined;

  const mutation = useMutation({
    mutationFn: (payload: CreateSamplePayload) => samplesApi.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      router.push(created.compoundId ? `/amostras/composto/${created.compoundId}` : '/amostras');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Nova amostra</h1>
      </div>
      <SampleForm
        defaultValues={compoundId ? { compoundId } : undefined}
        submitLabel="Criar amostra"
        onSubmit={(data) => mutation.mutateAsync(data)}
      />
    </div>
  );
}

export default function NovaAmostraPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={3} />}>
      <NovaAmostraContent />
    </Suspense>
  );
}
