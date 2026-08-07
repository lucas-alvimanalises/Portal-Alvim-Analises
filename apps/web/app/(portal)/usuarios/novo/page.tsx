'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateUserPayload } from '@portal-alvim/shared';
import { UserForm } from '../../../../components/forms/UserForm';
import { usersApi } from '../../../../lib/api/users.api';

export default function NovoUsuarioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      router.push('/usuarios');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Novo usuário</h1>
      </div>
      <UserForm submitLabel="Criar usuário" onSubmit={(data) => mutation.mutateAsync(data)} />
    </div>
  );
}
