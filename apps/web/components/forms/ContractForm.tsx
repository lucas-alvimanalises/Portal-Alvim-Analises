'use client';

import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { ContractDto, CreateContractPayload } from '@portal-alvim/shared';
import { clientsApi } from '../../lib/api/clients.api';
import { serviceTypesApi } from '../../lib/api/service-types.api';

interface ContractFormProps {
  defaultValues?: Partial<ContractDto> & { clientId?: string };
  onSubmit: (data: CreateContractPayload) => Promise<unknown>;
  submitLabel: string;
  lockClient?: boolean;
}

export function ContractForm({
  defaultValues,
  onSubmit,
  submitLabel,
  lockClient,
}: ContractFormProps) {
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: serviceTypesApi.list,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateContractPayload>({
    // Só os campos do formulário: espalhar o ContractDto inteiro vazaria
    // id/active/createdAt/updatedAt/scopes para o payload enviado.
    defaultValues: {
      clientId: defaultValues?.clientId,
      name: defaultValues?.name,
      description: defaultValues?.description ?? undefined,
      startDate: defaultValues?.startDate?.slice(0, 10),
      periodicity: defaultValues?.periodicity ?? undefined,
      serviceTypeIds: defaultValues?.scopes?.map((s) => s.serviceType.id),
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) =>
        // Quando nenhum checkbox de escopo é marcado, react-hook-form não
        // envia um array vazio — normaliza aqui para não quebrar a validação
        // @IsArray() opcional do backend.
        onSubmit({ ...data, serviceTypeIds: Array.isArray(data.serviceTypeIds) ? data.serviceTypeIds : [] }),
      )}
      className="card"
      style={{ maxWidth: 560, display: 'flex', flexDirection: 'column' }}
    >
      <div className="field">
        <label htmlFor="clientId">Empresa</label>
        <select
          id="clientId"
          className="input"
          disabled={lockClient}
          {...register('clientId', { required: 'Obrigatório' })}
        >
          <option value="">Selecione...</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName}
            </option>
          ))}
        </select>
        {errors.clientId && <span className="field-error">{errors.clientId.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="name">Nome do contrato</label>
        <input id="name" className="input" {...register('name', { required: 'Obrigatório' })} />
        {errors.name && <span className="field-error">{errors.name.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="description">Descrição</label>
        <textarea id="description" className="input" rows={3} {...register('description')} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="startDate">Data início</label>
          <input
            id="startDate"
            type="date"
            className="input"
            {...register('startDate', { required: 'Obrigatório' })}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="periodicity">Periodicidade</label>
          <input id="periodicity" className="input" placeholder="Mensal" {...register('periodicity')} />
        </div>
      </div>

      <div className="field">
        <label>Escopo do contrato</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {serviceTypes?.map((serviceType) => (
            <label key={serviceType.id} style={{ fontWeight: 400, fontSize: 14 }}>
              <input
                type="checkbox"
                value={serviceType.id}
                {...register('serviceTypeIds')}
                style={{ marginRight: 8 }}
              />
              {serviceType.name}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
