'use client';

import {
  MAINTENANCE_NATURE_LABELS_PT,
  MAINTENANCE_TYPE_OPTIONS,
  MaintenanceConflictDto,
} from '@portal-alvim/shared';

function typeLabel(key: string): string {
  return MAINTENANCE_TYPE_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

interface MaintenanceConflictModalProps {
  conflicts: MaintenanceConflictDto[];
  onCancel: () => void;
  onChooseAnotherDate: () => void;
  onConfirmAnyway: () => void;
  isSubmitting: boolean;
}

// Aviso mostrado quando o ScheduleForm detecta (via
// plantMaintenancesApi.checkConflicts) uma manutenção da planta programada/
// em andamento na mesma data do agendamento sendo criado/editado. Só uma
// checagem antecipada pro usuário — o bloqueio de verdade é sempre feito
// pelo backend (CreateScheduleUseCase/UpdateScheduleUseCase), mesmo que essa
// modal seja pulada de alguma forma.
export function MaintenanceConflictModal({
  conflicts,
  onCancel,
  onChooseAnotherDate,
  onConfirmAnyway,
  isSubmitting,
}: MaintenanceConflictModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div className="card" style={{ width: 460, maxWidth: '90vw' }}>
        <h3 style={{ marginTop: 0 }}>Manutenção programada nesta data</h3>
        <p style={{ fontSize: 14 }}>
          Existe uma manutenção programada para esta data. Deseja continuar mesmo assim?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              style={{
                fontSize: 13,
                background: '#fef9c3',
                color: '#854d0e',
                padding: 8,
                borderRadius: 6,
              }}
            >
              <strong>{new Date(conflict.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong>{' '}
              — {MAINTENANCE_NATURE_LABELS_PT[conflict.nature]}
              {conflict.types.length > 0 && ` (${conflict.types.map(typeLabel).join(', ')})`}
              <br />
              {conflict.description}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar agendamento
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onChooseAnotherDate}
            disabled={isSubmitting}
          >
            Escolher outra data
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirmAnyway}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Agendar mesmo assim'}
          </button>
        </div>
      </div>
    </div>
  );
}
