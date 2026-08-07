'use client';

import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { AnalysisStatus, ANALYSIS_STATUS_LABELS_PT, CreateSamplePayload, SampleDto } from '@portal-alvim/shared';
import { compoundsApi } from '../../lib/api/compounds.api';
import { schedulesApi } from '../../lib/api/schedules.api';
import { usersApi } from '../../lib/api/users.api';

interface SampleFormProps {
  defaultValues?: Partial<SampleDto>;
  onSubmit: (data: CreateSamplePayload) => Promise<unknown>;
  submitLabel: string;
  lockSchedule?: boolean;
}

export function SampleForm({ defaultValues, onSubmit, submitLabel, lockSchedule }: SampleFormProps) {
  const { data: schedules } = useQuery({ queryKey: ['schedules'], queryFn: () => schedulesApi.list() });
  const { data: compounds } = useQuery({ queryKey: ['compounds'], queryFn: compoundsApi.list });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSamplePayload & { clientId?: string }>({
    // Só os campos do formulário: espalhar o SampleDto inteiro vazaria
    // id/active/createdAt/updatedAt/*Name para o payload enviado.
    defaultValues: {
      scheduleId: defaultValues?.scheduleId,
      samplingPointId: defaultValues?.samplingPointId ?? undefined,
      compoundId: defaultValues?.compoundId ?? undefined,
      collectionDate: defaultValues?.collectionDate?.slice(0, 10),
      collectionLocation: defaultValues?.collectionLocation ?? undefined,
      responsibleUserId: defaultValues?.responsibleUserId ?? undefined,
      notes: defaultValues?.notes ?? undefined,
      sampleCode: defaultValues?.sampleCode ?? undefined,
      analysisStatus: defaultValues?.analysisStatus ?? AnalysisStatus.PENDING,
    },
  });

  const selectedScheduleId = watch('scheduleId');
  const selectedSchedule = schedules?.find((s) => s.id === selectedScheduleId);
  const samplingPointOptions = selectedSchedule?.samplingPoints ?? [];

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({ ...data, clientId: selectedSchedule?.clientId ?? '' }),
      )}
      className="card"
      style={{ maxWidth: 560, display: 'flex', flexDirection: 'column' }}
    >
      <div className="field">
        <label htmlFor="scheduleId">Agendamento</label>
        <select
          id="scheduleId"
          className="input"
          disabled={lockSchedule}
          {...register('scheduleId', { required: 'Obrigatório' })}
        >
          <option value="">Selecione...</option>
          {schedules?.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} —{' '}
              {schedule.clientName} — {schedule.serviceTypeName}
            </option>
          ))}
        </select>
        {errors.scheduleId && <span className="field-error">{errors.scheduleId.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="samplingPointId">Ponto de amostragem</label>
        <select id="samplingPointId" className="input" {...register('samplingPointId')}>
          <option value="">
            {selectedScheduleId ? 'Nenhum específico' : 'Selecione o agendamento primeiro'}
          </option>
          {samplingPointOptions.map((point) => (
            <option key={point.samplingPointId} value={point.samplingPointId}>
              {point.samplingPointName}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="compoundId">Composto</label>
        <select
          id="compoundId"
          className="input"
          {...register('compoundId', { required: 'Obrigatório' })}
        >
          <option value="">Selecione...</option>
          {compounds
            ?.filter((c) => c.active)
            .map((compound) => (
              <option key={compound.id} value={compound.id}>
                {compound.code} - {compound.name}
              </option>
            ))}
        </select>
        {errors.compoundId && <span className="field-error">{errors.compoundId.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="collectionDate">Data da coleta</label>
        <input
          id="collectionDate"
          type="date"
          className="input"
          {...register('collectionDate', { required: 'Obrigatório' })}
        />
        {errors.collectionDate && (
          <span className="field-error">{errors.collectionDate.message}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="sampleCode">Código da amostra (opcional)</label>
          <input id="sampleCode" className="input" {...register('sampleCode')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="analysisStatus">Status da análise</label>
          <select id="analysisStatus" className="input" {...register('analysisStatus')}>
            {Object.values(AnalysisStatus).map((status) => (
              <option key={status} value={status}>
                {ANALYSIS_STATUS_LABELS_PT[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="collectionLocation">Local da coleta (opcional)</label>
        <input
          id="collectionLocation"
          className="input"
          placeholder="Detalhe adicional, se necessário"
          {...register('collectionLocation')}
        />
      </div>

      <div className="field">
        <label htmlFor="responsibleUserId">Responsável pela coleta</label>
        <select id="responsibleUserId" className="input" {...register('responsibleUserId')}>
          <option value="">Selecione...</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="notes">Observações</label>
        <textarea id="notes" className="input" rows={3} {...register('notes')} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
