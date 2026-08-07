'use client';

import { Controller, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { CreateUserPayload, Role, ROLE_LABELS_PT, UserDto } from '@portal-alvim/shared';
import { clientsApi } from '../../lib/api/clients.api';
import { MultiSelect } from './MultiSelect';

interface UserFormProps {
  defaultValues?: Partial<UserDto>;
  onSubmit: (data: CreateUserPayload) => Promise<unknown>;
  submitLabel: string;
  requirePassword?: boolean;
}

export function UserForm({
  defaultValues,
  onSubmit,
  submitLabel,
  requirePassword = true,
}: UserFormProps) {
  const { data: allCompanies } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  // Só empresas ativas fazem sentido para vincular um novo acesso.
  const companies = allCompanies?.filter((c) => c.status === 'ACTIVE');

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserPayload>({
    // Só os campos do formulário: espalhar o UserDto inteiro vazaria id/active
    // (não aceitos pelo backend em create/update) para o payload.
    defaultValues: {
      name: defaultValues?.name,
      email: defaultValues?.email,
      role: defaultValues?.role ?? Role.TECHNICIAN,
      phone: defaultValues?.phone ?? undefined,
      jobTitle: defaultValues?.jobTitle ?? undefined,
      clientIds: defaultValues?.clientIds ?? [],
      emailNotifications: defaultValues?.emailNotifications ?? true,
    },
  });

  const selectedRole = watch('role');

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({
          ...data,
          // Só envia clientIds quando o papel realmente usa (evita lixo em
          // usuários Admin/Gestor/Técnico caso o papel tenha sido trocado no formulário).
          clientIds: data.role === Role.CLIENT ? data.clientIds ?? [] : [],
        }),
      )}
      className="card"
      style={{ maxWidth: 560, display: 'flex', flexDirection: 'column' }}
    >
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" className="input" {...register('name', { required: 'Obrigatório' })} />
        {errors.name && <span className="field-error">{errors.name.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          className="input"
          {...register('email', { required: 'Obrigatório' })}
        />
        {errors.email && <span className="field-error">{errors.email.message}</span>}
      </div>

      {requirePassword && (
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            className="input"
            {...register('password', { required: 'Obrigatório', minLength: 6 })}
          />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </div>
      )}

      <div className="field">
        <label htmlFor="role">Papel</label>
        <select id="role" className="input" {...register('role', { required: true })}>
          {Object.values(Role).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS_PT[role]}
            </option>
          ))}
        </select>
      </div>

      {selectedRole === Role.CLIENT && (
        <>
          <div className="field">
            <label>Empresas com acesso</label>
            <Controller
              name="clientIds"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  options={(companies ?? []).map((c) => ({ value: c.id, label: c.companyName }))}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Selecione as empresas..."
                  emptyMessage="Nenhuma empresa cadastrada ainda."
                />
              )}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            <input type="checkbox" {...register('emailNotifications')} />
            Receber notificações por e-mail (ex.: Ordem de Serviço de agendamentos)
          </label>
        </>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="phone">Telefone</label>
          <input id="phone" className="input" {...register('phone')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="jobTitle">Cargo</label>
          <input id="jobTitle" className="input" {...register('jobTitle')} />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
