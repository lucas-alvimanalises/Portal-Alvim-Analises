'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateUserPayload } from '@portal-alvim/shared';
import { UserForm } from '../../../../components/forms/UserForm';
import { usersApi } from '../../../../lib/api/users.api';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', params.id],
    queryFn: () => usersApi.get(params.id),
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.update(params.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      router.push('/usuarios');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Editar usuário</h1>
      </div>
      {isLoading || !data ? (
        <TableSkeleton />
      ) : (
        <UserForm
          defaultValues={data}
          requirePassword={false}
          submitLabel="Salvar alterações"
          onSubmit={(formData) => mutation.mutateAsync(formData)}
        />
      )}
    </div>
  );
}
