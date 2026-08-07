'use client';

import { useForm } from 'react-hook-form';
import { ClientDto, CreateClientPayload } from '@portal-alvim/shared';

interface ClientFormProps {
  defaultValues?: Partial<ClientDto>;
  onSubmit: (data: CreateClientPayload) => Promise<unknown>;
  submitLabel: string;
}

export function ClientForm({ defaultValues, onSubmit, submitLabel }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientPayload>({
    // Monta defaultValues só com os campos do formulário: espalhar o DTO
    // inteiro deixaria campos não registrados (id, createdAt, updatedAt)
    // vazarem para o payload enviado — o backend rejeita isso (forbidNonWhitelisted).
    defaultValues: {
      companyName: defaultValues?.companyName,
      cnpj: defaultValues?.cnpj,
      city: defaultValues?.city ?? undefined,
      state: defaultValues?.state ?? undefined,
      address: defaultValues?.address ?? undefined,
      mapsUrl: defaultValues?.mapsUrl ?? undefined,
      mainContact: defaultValues?.mainContact ?? undefined,
      email: defaultValues?.email ?? undefined,
      phone: defaultValues?.phone ?? undefined,
    },
  });

  const mapsUrl = watch('mapsUrl');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="card"
      style={{ maxWidth: 560, display: 'flex', flexDirection: 'column' }}
    >
      <div className="field">
        <label htmlFor="companyName">Razão social</label>
        <input
          id="companyName"
          className="input"
          {...register('companyName', { required: 'Obrigatório' })}
        />
        {errors.companyName && <span className="field-error">{errors.companyName.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="cnpj">CNPJ</label>
        <input
          id="cnpj"
          className="input"
          placeholder="00.000.000/0000-00"
          {...register('cnpj', { required: 'Obrigatório' })}
        />
        {errors.cnpj && <span className="field-error">{errors.cnpj.message}</span>}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="city">Cidade</label>
          <input id="city" className="input" {...register('city')} />
        </div>
        <div className="field" style={{ width: 100 }}>
          <label htmlFor="state">UF</label>
          <input id="state" className="input" maxLength={2} {...register('state')} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">Endereço</label>
        <input id="address" className="input" {...register('address')} />
      </div>

      <div className="field">
        <label htmlFor="mapsUrl">Link do Google Maps</label>
        <input
          id="mapsUrl"
          type="url"
          className="input"
          placeholder="https://maps.app.goo.gl/..."
          {...register('mapsUrl', {
            pattern: {
              value: /^https?:\/\/.+/i,
              message: 'Cole um link completo (começando com https://).',
            },
          })}
        />
        {errors.mapsUrl && <span className="field-error">{errors.mapsUrl.message}</span>}
        {mapsUrl && !errors.mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
            Abrir no Maps ↗
          </a>
        )}
      </div>

      <div className="field">
        <label htmlFor="mainContact">Contato principal</label>
        <input id="mainContact" className="input" {...register('mainContact')} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" className="input" {...register('email')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="phone">Telefone</label>
          <input id="phone" className="input" {...register('phone')} />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
