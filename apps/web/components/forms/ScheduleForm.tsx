'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  CreateSchedulePayload,
  MaintenanceConflictDto,
  Role,
  ScheduleDto,
  ScheduleSamplingPointPayload,
} from '@portal-alvim/shared';
import { clientsApi } from '../../lib/api/clients.api';
import { compoundsApi } from '../../lib/api/compounds.api';
import { serviceTypesApi } from '../../lib/api/service-types.api';
import { samplingPointsApi } from '../../lib/api/sampling-points.api';
import { usersApi } from '../../lib/api/users.api';
import { plantMaintenancesApi } from '../../lib/api/plant-maintenances.api';
import { MultiSelect } from './MultiSelect';
import { MaintenanceConflictModal } from './MaintenanceConflictModal';

interface ScheduleFormProps {
  defaultValues?: Partial<ScheduleDto>;
  // Recebe sempre uma lista — 1 item no caso normal, N itens quando o
  // usuário escolhe "cadastrar vários meses de uma vez" (um agendamento por
  // mês, mesmo escopo de empresa/serviço/técnicos/pontos).
  onSubmit: (payloads: CreateSchedulePayload[]) => Promise<unknown>;
  submitLabel: string;
}

// Gera a lista de meses "AAAA-MM" entre start e end (inclusive), na ordem —
// usa Date com dia 1 pra não sofrer com meses de tamanhos diferentes.
function monthRange(start: string, end: string): string[] {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  const startIndex = startYear * 12 + (startMonth - 1);
  const endIndex = endYear * 12 + (endMonth - 1);
  if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex) || endIndex < startIndex) {
    return [];
  }
  const months: string[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const year = Math.floor(i / 12);
    const month = (i % 12) + 1;
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return months;
}

type FormFields = Omit<CreateSchedulePayload, 'samplingPoints' | 'technicianIds'>;

export function ScheduleForm({ defaultValues, onSubmit, submitLabel }: ScheduleFormProps) {
  const { data: companies } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: serviceTypesApi.list,
  });
  const { data: compounds } = useQuery({ queryKey: ['compounds'], queryFn: compoundsApi.list });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  // Gestor também pode ser designado responsável de campo, além de Técnico.
  const technicianOptions = (users ?? [])
    .filter((u) => u.role === Role.TECHNICIAN || u.role === Role.MANAGER)
    .map((u) => ({ value: u.id, label: u.name }));

  // Seleção de pontos + compostos (com quantidade) por ponto, no formato do payload da API.
  const [pointSelections, setPointSelections] = useState<ScheduleSamplingPointPayload[]>(
    defaultValues?.samplingPoints?.map((sp) => ({
      samplingPointId: sp.samplingPointId,
      compounds: sp.compounds.map((c) => ({ compoundId: c.id, quantity: c.quantity })),
    })) ?? [],
  );

  // Um serviço pode precisar de mais de um técnico em campo.
  const [technicianIds, setTechnicianIds] = useState<string[]>(
    defaultValues?.technicians?.map((t) => t.id) ?? [],
  );
  const [technicianError, setTechnicianError] = useState(false);
  const [bulkRangeError, setBulkRangeError] = useState(false);

  // Clientes mensais são agendados com meses de antecedência — pros serviços
  // muito futuros, só se sabe o mês ainda, não o dia certo. Nesse caso o
  // campo de data vira um seletor de mês (scheduledDate vai como dia 1 do
  // mês) e vira status "Programado" em vez de "Agendado" nas listas.
  const [dateConfirmed, setDateConfirmed] = useState(defaultValues?.dateConfirmed ?? true);

  // Cadastro em lote: só faz sentido criar um agendamento novo (não editar um
  // já existente) e só quando a data ainda não é exata — gera um
  // agendamento por mês do intervalo, todos com o mesmo escopo preenchido
  // abaixo (confirmado com o usuário).
  const isNewSchedule = !defaultValues;
  const [bulkMonths, setBulkMonths] = useState(false);
  const [bulkStartMonth, setBulkStartMonth] = useState('');
  const [bulkEndMonth, setBulkEndMonth] = useState('');
  const bulkMonthList = bulkMonths ? monthRange(bulkStartMonth, bulkEndMonth) : [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    // shouldUnregister: o campo scheduledDate some do DOM no modo "vários
    // meses" — sem isso, a regra required de quando ele existia ficaria
    // presa, bloqueando o submit em silêncio (o campo nem aparece pro
    // usuário corrigir).
    shouldUnregister: true,
    // Só os campos do formulário: espalhar o ScheduleDto inteiro vazaria
    // id/status/createdAt/updatedAt/*Name para o payload enviado.
    defaultValues: {
      clientId: defaultValues?.clientId,
      serviceTypeId: defaultValues?.serviceTypeId,
      scheduledDate: defaultValues?.scheduledDate?.slice(
        0,
        defaultValues?.dateConfirmed === false ? 7 : 10,
      ),
      endDate: defaultValues?.endDate?.slice(0, 10),
    },
  });

  // Só depois que o input já trocou de type="date" pra type="month" (ou
  // vice-versa) é seguro escrever o valor convertido nele — escrever antes
  // (no mesmo evento que muda `dateConfirmed`) faz o navegador rejeitar o
  // valor por não bater com o type ainda antigo, e o campo fica em branco.
  const previousDateConfirmedRef = useRef(dateConfirmed);
  useEffect(() => {
    if (previousDateConfirmedRef.current === dateConfirmed) return;
    previousDateConfirmedRef.current = dateConfirmed;
    const currentValue = getValues('scheduledDate');
    if (currentValue) {
      const monthPart = currentValue.slice(0, 7);
      setValue('scheduledDate', dateConfirmed ? `${monthPart}-01` : monthPart);
    }
  }, [dateConfirmed, getValues, setValue]);

  // Selects nativos + defaultValue "não controlado" do react-hook-form: se a
  // lista de opções (busca separada, mais lenta) ainda não tiver chegado no
  // momento em que o campo registra o valor inicial, o <select> não acha a
  // <option> correspondente e volta pro primeiro item ("Selecione..."),
  // perdendo o valor salvo silenciosamente. Reaplica assim que cada lista chega.
  useEffect(() => {
    if (defaultValues?.clientId && companies?.some((c) => c.id === defaultValues.clientId)) {
      setValue('clientId', defaultValues.clientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  useEffect(() => {
    if (
      defaultValues?.serviceTypeId &&
      serviceTypes?.some((s) => s.id === defaultValues.serviceTypeId)
    ) {
      setValue('serviceTypeId', defaultValues.serviceTypeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceTypes]);

  const selectedClientId = watch('clientId');
  const { data: samplingPoints } = useQuery({
    queryKey: ['sampling-points', selectedClientId],
    queryFn: () => samplingPointsApi.listByClient(selectedClientId),
    enabled: !!selectedClientId,
  });

  // Pontos são por empresa: ao trocar a empresa, a seleção de pontos/compostos
  // de outra empresa não faz mais sentido — limpa. Compara contra o último
  // clientId "conhecido" (não um simples "já rodou uma vez"): um booleano de
  // primeira-renderização não sobrevive ao duplo-invoke de efeitos do
  // StrictMode em dev (mount → cleanup → mount de novo), que zerava a seleção
  // já salva ao abrir a tela de edição.
  const lastClientIdRef = useRef(selectedClientId);
  useEffect(() => {
    if (selectedClientId === lastClientIdRef.current) {
      return;
    }
    lastClientIdRef.current = selectedClientId;
    setPointSelections([]);
  }, [selectedClientId]);

  const activePoints = (samplingPoints ?? []).filter((p) => p.active);
  const compoundOptions = (compounds ?? [])
    .filter((c) => c.active)
    .map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));

  function togglePoint(ids: string[]) {
    setPointSelections((current) => {
      // Mantém os compostos já escolhidos dos pontos que continuam selecionados.
      const kept = current.filter((sel) => ids.includes(sel.samplingPointId));
      const added = ids
        .filter((id) => !current.some((sel) => sel.samplingPointId === id))
        .map((id) => ({ samplingPointId: id, compounds: [] }));
      return [...kept, ...added];
    });
  }

  function togglePointCompounds(samplingPointId: string, compoundIds: string[]) {
    setPointSelections((current) =>
      current.map((sel) => {
        if (sel.samplingPointId !== samplingPointId) return sel;
        const kept = sel.compounds.filter((c) => compoundIds.includes(c.compoundId));
        const added = compoundIds
          .filter((id) => !sel.compounds.some((c) => c.compoundId === id))
          .map((id) => ({ compoundId: id, quantity: 1 }));
        return { ...sel, compounds: [...kept, ...added] };
      }),
    );
  }

  function setCompoundQuantity(samplingPointId: string, compoundId: string, quantity: number) {
    setPointSelections((current) =>
      current.map((sel) =>
        sel.samplingPointId !== samplingPointId
          ? sel
          : {
              ...sel,
              compounds: sel.compounds.map((c) =>
                c.compoundId === compoundId ? { ...c, quantity } : c,
              ),
            },
      ),
    );
  }

  // Aviso de manutenção da planta programada na mesma data (ver
  // PlantMaintenancesService.checkConflicts) — checagem antecipada só pra
  // avisar antes de submeter; o bloqueio de verdade é sempre do backend.
  const [conflictState, setConflictState] = useState<{
    payloads: CreateSchedulePayload[];
    conflicts: MaintenanceConflictDto[];
  } | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Trocar o type do input (date <-> month) não garante que o navegador
  // reaproveite o valor já digitado — em vez de confiar nisso, convertemos
  // o valor na mão (AAAA-MM-DD <-> AAAA-MM) toda vez que o modo muda.
  function buildPayloads(data: FormFields): CreateSchedulePayload[] | undefined {
    const baseFields = {
      clientId: data.clientId,
      serviceTypeId: data.serviceTypeId,
      contractId: data.contractId,
      technicianIds,
      samplingPoints: pointSelections,
    };

    if (bulkMonths) {
      if (bulkMonthList.length === 0) {
        setBulkRangeError(true);
        return undefined;
      }
      setBulkRangeError(false);
      return bulkMonthList.map((month) => ({
        ...baseFields,
        scheduledDate: `${month}-01`,
        dateConfirmed: false,
      }));
    }

    // Com "só o mês", o input é type="month" (valor "AAAA-MM") — completa
    // com o dia 1 pra virar uma data de calendário válida.
    const scheduledDate = dateConfirmed ? data.scheduledDate : `${data.scheduledDate}-01`;
    return [
      {
        ...baseFields,
        scheduledDate,
        endDate: data.endDate,
        dateConfirmed,
      },
    ];
  }

  async function handleFormSubmit(data: FormFields) {
    if (technicianIds.length === 0) {
      setTechnicianError(true);
      return;
    }
    setTechnicianError(false);

    const payloads = buildPayloads(data);
    if (!payloads) return;

    setIsCheckingConflicts(true);
    try {
      const conflictLists = await Promise.all(
        payloads.map((p) =>
          plantMaintenancesApi.checkConflicts(p.clientId, p.scheduledDate, p.endDate).catch(() => []),
        ),
      );
      const conflicts = Array.from(
        new Map(conflictLists.flat().map((c) => [c.id, c])).values(),
      );
      if (conflicts.length > 0) {
        setConflictState({ payloads, conflicts });
        return;
      }
    } finally {
      setIsCheckingConflicts(false);
    }

    return onSubmit(payloads);
  }

  async function handleConfirmAnyway() {
    if (!conflictState) return;
    setIsSubmittingOverride(true);
    try {
      await onSubmit(
        conflictState.payloads.map((p) => ({ ...p, overrideMaintenanceWarning: true })),
      );
      setConflictState(null);
    } finally {
      setIsSubmittingOverride(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}
    >
      <div className="card">
        <h2 style={{ margin: '0 0 16px', fontSize: 15 }}>Dados gerais</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="clientId">Empresa</label>
            <select
              id="clientId"
              className="input"
              {...register('clientId', { required: 'Obrigatório' })}
            >
              <option value="">Selecione...</option>
              {companies
                ?.filter((c) => c.status === 'ACTIVE')
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName}
                  </option>
                ))}
            </select>
            {errors.clientId && <span className="field-error">{errors.clientId.message}</span>}
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="serviceTypeId">Serviço</label>
            <select
              id="serviceTypeId"
              className="input"
              {...register('serviceTypeId', { required: 'Obrigatório' })}
            >
              <option value="">Selecione...</option>
              {serviceTypes?.map((serviceType) => (
                <option key={serviceType.id} value={serviceType.id}>
                  {serviceType.name}
                </option>
              ))}
            </select>
            {errors.serviceTypeId && (
              <span className="field-error">{errors.serviceTypeId.message}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Técnicos responsáveis</label>
            <MultiSelect
              options={technicianOptions}
              value={technicianIds}
              onChange={(ids) => {
                setTechnicianIds(ids);
                if (ids.length > 0) setTechnicianError(false);
              }}
              placeholder="Selecione os técnicos..."
              emptyMessage="Nenhum técnico cadastrado."
            />
            {technicianError && (
              <span className="field-error">Selecione ao menos um técnico.</span>
            )}
          </div>

          {bulkMonths ? (
            <div className="field" style={{ flex: 2 }}>
              <label>Período (um agendamento por mês)</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="month"
                  className="input"
                  value={bulkStartMonth}
                  onChange={(e) => setBulkStartMonth(e.target.value)}
                />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>até</span>
                <input
                  type="month"
                  className="input"
                  value={bulkEndMonth}
                  onChange={(e) => setBulkEndMonth(e.target.value)}
                />
              </div>
              {bulkRangeError && (
                <span className="field-error">Escolha um período válido (início até fim).</span>
              )}
              {bulkMonthList.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {bulkMonthList.length} agendamento{bulkMonthList.length > 1 ? 's' : ''} serão
                  criados, um por mês.
                </span>
              )}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={bulkMonths}
                  onChange={(e) => setBulkMonths(e.target.checked)}
                />
                Cadastrar vários meses de uma vez (mesmo escopo)
              </label>
            </div>
          ) : (
            <>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="scheduledDate">
                  {dateConfirmed ? 'Data início' : 'Mês previsto'}
                </label>
                <input
                  id="scheduledDate"
                  type={dateConfirmed ? 'date' : 'month'}
                  className="input"
                  {...register('scheduledDate', { required: 'Obrigatório' })}
                />
                {errors.scheduledDate && (
                  <span className="field-error">{errors.scheduledDate.message}</span>
                )}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginTop: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!dateConfirmed}
                    onChange={(e) => {
                      const uncertain = e.target.checked;
                      setDateConfirmed(!uncertain);
                      if (!uncertain) setBulkMonths(false);
                    }}
                  />
                  Ainda não sei a data exata (só o mês)
                </label>
                {isNewSchedule && !dateConfirmed && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginTop: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={bulkMonths}
                      onChange={(e) => setBulkMonths(e.target.checked)}
                    />
                    Cadastrar vários meses de uma vez (mesmo escopo)
                  </label>
                )}
              </div>

              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="endDate">Data fim (opcional)</label>
                <input id="endDate" type="date" className="input" {...register('endDate')} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Deixe em branco para serviço de 1 dia.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 16px', fontSize: 15 }}>Pontos de amostragem</h2>
        <div className="field">
          <MultiSelect
            options={activePoints.map((p) => ({ value: p.id, label: p.name }))}
            value={pointSelections.map((sel) => sel.samplingPointId)}
            onChange={togglePoint}
            placeholder={selectedClientId ? 'Selecione os pontos...' : 'Selecione a empresa primeiro'}
            emptyMessage="Nenhum ponto de amostragem cadastrado para esta empresa."
          />
        </div>

        {pointSelections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pointSelections.map((sel) => {
              const point = activePoints.find((p) => p.id === sel.samplingPointId);
              return (
                <div
                  key={sel.samplingPointId}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    {point?.name ?? 'Ponto'}
                  </div>

                  <MultiSelect
                    options={compoundOptions}
                    value={sel.compounds.map((c) => c.compoundId)}
                    onChange={(ids) => togglePointCompounds(sel.samplingPointId, ids)}
                    placeholder="Selecione os compostos..."
                    emptyMessage="Nenhum composto cadastrado."
                  />

                  {sel.compounds.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sel.compounds.map((c) => {
                        const compound = compoundOptions.find((o) => o.value === c.compoundId);
                        return (
                          <div
                            key={c.compoundId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              padding: '4px 0',
                              borderTop: '1px solid var(--color-border)',
                            }}
                          >
                            <span style={{ fontSize: 14 }}>{compound?.label}</span>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              Qtd. amostras
                              <input
                                type="number"
                                min={1}
                                className="input"
                                style={{ width: 60, padding: '4px 6px' }}
                                value={c.quantity}
                                onChange={(e) =>
                                  setCompoundQuantity(
                                    sel.samplingPointId,
                                    c.compoundId,
                                    Math.max(1, Number(e.target.value) || 1),
                                  )
                                }
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isSubmitting || isCheckingConflicts}
        style={{ alignSelf: 'flex-start' }}
      >
        {isCheckingConflicts ? 'Verificando agenda...' : isSubmitting ? 'Salvando...' : submitLabel}
      </button>

      {conflictState && (
        <MaintenanceConflictModal
          conflicts={conflictState.conflicts}
          isSubmitting={isSubmittingOverride}
          onCancel={() => setConflictState(null)}
          onChooseAnotherDate={() => setConflictState(null)}
          onConfirmAnyway={handleConfirmAnyway}
        />
      )}
    </form>
  );
}
