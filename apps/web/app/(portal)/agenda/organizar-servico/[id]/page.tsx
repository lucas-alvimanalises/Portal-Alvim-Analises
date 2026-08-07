'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '../../../../../lib/api/schedules.api';
import { custodyExtractionsApi } from '../../../../../lib/api/custody-extractions.api';
import { TableSkeleton } from '../../../../../components/shared/Skeleton';

// Códigos fixos do seed (ver apps/backend/prisma/seed.ts) — únicos dois
// compostos que hoje precisam de etiqueta física na Zebra ZD-220.
const SILOXANOS_CODE = '11000';
const ENXOFRE_CODE = '22000';

export default function OrganizarServicoPage() {
  const params = useParams<{ id: string }>();
  const scheduleId = params.id;

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedules', scheduleId],
    queryFn: () => schedulesApi.get(scheduleId),
  });

  if (isLoading || !schedule) {
    return <TableSkeleton />;
  }

  const compounds = schedule.samplingPoints.flatMap((point) => point.compounds);
  const siloxanos = compounds.find((c) => c.code === SILOXANOS_CODE);
  const enxofre = compounds.find((c) => c.code === ENXOFRE_CODE);

  return (
    <div>
      <div className="page-header">
        <h1>Organizar Serviço</h1>
      </div>
      <p style={{ marginTop: -8 }}>
        <strong>{schedule.clientName}</strong> — {schedule.serviceTypeName}
      </p>

      <div
        className="card"
        style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          style={{ justifyContent: 'flex-start' }}
          onClick={() => window.open(custodyExtractionsApi.downloadBlankUrl(scheduleId), '_blank')}
        >
          Imprimir cadeias de custódia
        </button>

        {siloxanos && (
          <Link
            href={`/agenda/organizar-servico/${scheduleId}/etiquetas/${siloxanos.id}`}
            target="_blank"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            Imprimir etiqueta de Siloxanos
          </Link>
        )}

        {enxofre && (
          <Link
            href={`/agenda/organizar-servico/${scheduleId}/etiquetas/${enxofre.id}`}
            target="_blank"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            Imprimir etiqueta de Compostos de Enxofre
          </Link>
        )}

        <Link
          href={`/agenda/organizar-servico/${scheduleId}/checklist`}
          className="btn btn-secondary"
          style={{ justifyContent: 'flex-start' }}
        >
          Preencher Check List de Campo
        </Link>
      </div>
    </div>
  );
}
