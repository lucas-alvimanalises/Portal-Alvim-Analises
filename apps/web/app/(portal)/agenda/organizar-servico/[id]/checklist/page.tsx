'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FIELD_CHECKLIST_SECTIONS } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../../../lib/api/schedules.api';
import { fieldChecklistsApi } from '../../../../../../lib/api/field-checklists.api';
import { TableSkeleton } from '../../../../../../components/shared/Skeleton';

// Check list de material de campo — conteúdo fixo adaptado do "CheckList
// Alvim Análises.xlsx" (ver FIELD_CHECKLIST_SECTIONS). Cada item tem uma
// quantidade (ex.: "9 Impingers"), não só marcado/desmarcado — 0 ou vazio
// significa "não levou". Um por agendamento; salvar de novo sobrescreve
// (reabrir e corrigir é esperado, não é um histórico de versões).
export default function ChecklistCampoPage() {
  const params = useParams<{ id: string }>();
  const scheduleId = params.id;
  const queryClient = useQueryClient();

  const { data: schedule } = useQuery({
    queryKey: ['schedules', scheduleId],
    queryFn: () => schedulesApi.get(scheduleId),
  });

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['field-checklist', scheduleId],
    queryFn: () => fieldChecklistsApi.get(scheduleId),
  });

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);

  // Só inicializa o estado local uma vez, quando os dados chegam — depois
  // disso o usuário é quem manda (evita sobrescrever o que já foi digitado
  // por causa de um refetch em segundo plano).
  useEffect(() => {
    if (!initialized && checklist !== undefined) {
      setQuantities(checklist?.quantities ?? {});
      setInitialized(true);
    }
  }, [checklist, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => fieldChecklistsApi.save(scheduleId, { quantities }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['field-checklist', scheduleId], saved);
    },
  });

  function setQuantity(key: string, value: string) {
    const parsed = value === '' ? 0 : Math.max(0, Math.floor(Number(value)));
    setQuantities((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  const totalItems = FIELD_CHECKLIST_SECTIONS.reduce((sum, section) => sum + section.items.length, 0);
  const filledCount = Object.values(quantities).filter((q) => q > 0).length;

  return (
    <div>
      <div className="page-header">
        <h1>Check List de Campo</h1>
      </div>
      {schedule && (
        <p style={{ marginTop: -8 }}>
          <strong>{schedule.clientName}</strong> — {schedule.serviceTypeName}
        </p>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {filledCount}/{totalItems} itens com quantidade.
            {checklist && (
              <>
                {' '}
                Última vez preenchido por <strong>{checklist.filledByName}</strong> em{' '}
                {new Date(checklist.updatedAt).toLocaleString('pt-BR')}.
              </>
            )}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {FIELD_CHECKLIST_SECTIONS.map((section) => (
              <div key={section.key} className="card">
                <h3 style={{ marginTop: 0, fontSize: 15 }}>{section.label}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {section.items.map((item) => (
                    <div
                      key={item.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                    >
                      <input
                        type="number"
                        min={0}
                        className="input"
                        style={{ width: 60, padding: '4px 6px', textAlign: 'center' }}
                        value={quantities[item.key] || ''}
                        placeholder="0"
                        onChange={(e) => setQuantity(item.key, e.target.value)}
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            {saveMutation.isSuccess && (
              <span style={{ color: 'var(--color-primary)', fontSize: 13 }}>✓ Salvo</span>
            )}
            {saveMutation.isError && (
              <span style={{ color: 'var(--color-danger)', fontSize: 13 }}>
                Não foi possível salvar.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
