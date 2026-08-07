'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CreatePlantMaintenancePayload,
  MAINTENANCE_NATURE_LABELS_PT,
  MAINTENANCE_OBJECTIVE_OPTIONS,
  MAINTENANCE_STATUS_LABELS_PT,
  MAINTENANCE_TYPE_OPTIONS,
  MaintenanceNature,
  MaintenanceStatus,
  PlantMaintenanceDto,
  Role,
} from '@portal-alvim/shared';
import { useCurrentUser } from '../../lib/auth/useCurrentUser';
import { MultiSelect } from '../forms/MultiSelect';

interface PlantMaintenanceFormProps {
  clientId: string;
  defaultValues?: PlantMaintenanceDto;
  onSubmit: (payload: CreatePlantMaintenancePayload) => Promise<unknown>;
  submitLabel: string;
}

type FormFields = {
  date: string;
  startTime: string;
  endTime: string;
  status: MaintenanceStatus;
  nature: MaintenanceNature | '';
  description: string;
};

const typeOptions = MAINTENANCE_TYPE_OPTIONS.map((o) => ({ value: o.key, label: o.label }));
const objectiveOptions = MAINTENANCE_OBJECTIVE_OPTIONS.map((o) => ({ value: o.key, label: o.label }));

// Formulário de cadastro/edição de manutenção da planta — usado tanto por
// /manutencao/[clientId]/nova quanto /manutencao/[clientId]/[maintenanceId]
// (mesmo padrão de ScheduleForm.tsx). Sem campo de Empresa: o clientId vem
// fixo da própria URL (ver plano — sem entidade Unidade/Planta nesta fase).
export function PlantMaintenanceForm({
  clientId,
  defaultValues,
  onSubmit,
  submitLabel,
}: PlantMaintenanceFormProps) {
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  // Cliente não edita uma manutenção já concluída/cancelada (o backend também
  // barra — isso aqui é só UX pra não deixar preencher e apanhar um erro).
  const isLockedForClient =
    isClient &&
    !!defaultValues &&
    (defaultValues.status === MaintenanceStatus.COMPLETED ||
      defaultValues.status === MaintenanceStatus.CANCELLED);

  const [types, setTypes] = useState<string[]>(defaultValues?.types ?? []);
  const [otherType, setOtherType] = useState(defaultValues?.otherType ?? '');
  const [objectives, setObjectives] = useState<string[]>(defaultValues?.objectives ?? []);
  const [otherObjective, setOtherObjective] = useState(defaultValues?.otherObjective ?? '');
  const [typesError, setTypesError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    defaultValues: {
      date: defaultValues?.date?.slice(0, 10),
      startTime: defaultValues?.startTime ?? '',
      endTime: defaultValues?.endTime ?? '',
      status: defaultValues?.status ?? MaintenanceStatus.SCHEDULED,
      nature: defaultValues?.nature ?? '',
      description: defaultValues?.description ?? '',
    },
  });

  function handleFormSubmit(data: FormFields) {
    if (types.length === 0 && !otherType.trim()) {
      setTypesError(true);
      return;
    }
    setTypesError(false);

    return onSubmit({
      clientId,
      date: data.date,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      status: data.status,
      nature: data.nature as MaintenanceNature,
      types,
      otherType: otherType.trim() || undefined,
      objectives,
      otherObjective: otherObjective.trim() || undefined,
      description: data.description,
    });
  }

  return (
    <fieldset
      disabled={isLockedForClient || isSubmitting}
      style={{ border: 'none', padding: 0, margin: 0 }}
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}
      >
        {isLockedForClient && (
          <div className="card" style={{ background: 'var(--color-bg)' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
              Esta manutenção já está {MAINTENANCE_STATUS_LABELS_PT[defaultValues!.status].toLowerCase()}{' '}
              e não pode mais ser editada.
            </p>
          </div>
        )}

        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 15 }}>Dados gerais</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="date">Data</label>
              <input
                id="date"
                type="date"
                className="input"
                {...register('date', { required: 'Obrigatório' })}
              />
              {errors.date && <span className="field-error">{errors.date.message}</span>}
            </div>

            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="startTime">Hora início (opcional)</label>
              <input id="startTime" type="time" className="input" {...register('startTime')} />
            </div>

            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="endTime">Hora fim (opcional)</label>
              <input id="endTime" type="time" className="input" {...register('endTime')} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="status">Status</label>
              <select id="status" className="input" {...register('status', { required: true })}>
                {Object.values(MaintenanceStatus).map((status) => (
                  <option key={status} value={status}>
                    {MAINTENANCE_STATUS_LABELS_PT[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="nature">Natureza</label>
              <select
                id="nature"
                className="input"
                {...register('nature', { required: 'Obrigatório' })}
              >
                <option value="">Selecione...</option>
                {Object.values(MaintenanceNature).map((nature) => (
                  <option key={nature} value={nature}>
                    {MAINTENANCE_NATURE_LABELS_PT[nature]}
                  </option>
                ))}
              </select>
              {errors.nature && <span className="field-error">{errors.nature.message}</span>}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 15 }}>Tipo da manutenção</h2>
          <div className="field">
            <MultiSelect
              options={typeOptions}
              value={types}
              onChange={(ids) => {
                setTypes(ids);
                if (ids.length > 0 || otherType.trim()) setTypesError(false);
              }}
              placeholder="Selecione os equipamentos/sistemas envolvidos..."
            />
            {typesError && (
              <span className="field-error">
                Selecione ao menos um tipo, ou descreva em &quot;Outro&quot;.
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="otherType">Outro (opcional)</label>
            <input
              id="otherType"
              type="text"
              className="input"
              value={otherType}
              onChange={(e) => {
                setOtherType(e.target.value);
                if (e.target.value.trim() || types.length > 0) setTypesError(false);
              }}
              placeholder="Descreva se não está na lista acima"
            />
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 15 }}>Objetivo da manutenção</h2>
          <div className="field">
            <MultiSelect
              options={objectiveOptions}
              value={objectives}
              onChange={setObjectives}
              placeholder="Selecione o(s) objetivo(s)..."
            />
          </div>
          <div className="field">
            <label htmlFor="otherObjective">Outro (opcional)</label>
            <input
              id="otherObjective"
              type="text"
              className="input"
              value={otherObjective}
              onChange={(e) => setOtherObjective(e.target.value)}
              placeholder="Descreva se não está na lista acima"
            />
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 15 }}>Descrição</h2>
          <div className="field">
            <textarea
              id="description"
              className="input"
              rows={4}
              {...register('description', { required: 'Obrigatório' })}
              placeholder="Detalhe o que foi (ou será) feito nesta manutenção..."
            />
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
          </div>
        </div>

        {!isLockedForClient && (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ alignSelf: 'flex-start' }}
          >
            {isSubmitting ? 'Salvando...' : submitLabel}
          </button>
        )}
      </form>
    </fieldset>
  );
}
