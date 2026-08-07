'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compoundsApi } from '../../../lib/api/compounds.api';
import { custodyDocumentsApi } from '../../../lib/api/custody-documents.api';
import { ApiError } from '../../../lib/api/client';
import { TableSkeleton } from '../../../components/shared/Skeleton';

// Tela de Cadeia de Custódia em formato de "pastas": uma pasta por composto
// (11000 - Siloxanos, 12000 - VOCs, ...), espelhando a organização de
// diretórios que a Alvim já usa no OneDrive (Amostragem de Campo > composto
// > ano). Cada pasta guarda os PDFs de cadeia de custódia daquele composto.
export default function CadeiaDeCustodiaPage() {
  const queryClient = useQueryClient();
  const { data: compounds, isLoading } = useQuery({
    queryKey: ['compounds'],
    queryFn: compoundsApi.list,
  });
  const { data: documents } = useQuery({
    queryKey: ['custody-documents'],
    queryFn: () => custodyDocumentsApi.list(),
  });

  // Botão "Atualizar pastas" — varre a pasta local do OneDrive configurada
  // no backend e sobe qualquer PDF novo. Solução de transição enquanto nem
  // tudo é carregado direto na plataforma.
  const syncMutation = useMutation({
    mutationFn: () => custodyDocumentsApi.sync(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custody-documents'] }),
  });

  const countByCompound = new Map<string, number>();
  documents?.forEach((doc) => {
    countByCompound.set(doc.compoundId, (countByCompound.get(doc.compoundId) ?? 0) + 1);
  });

  return (
    <div>
      <div className="page-header">
        <h1>Cadeia de Custódia</h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? 'Atualizando...' : 'Atualizar pastas'}
        </button>
      </div>

      {syncMutation.isError && (
        <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: -12 }}>
          {syncMutation.error instanceof ApiError
            ? syncMutation.error.message
            : 'Não foi possível atualizar as pastas.'}
        </p>
      )}
      {syncMutation.isSuccess && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: -12 }}>
          {syncMutation.data.uploaded} documento(s) novo(s) importado(s)
          {syncMutation.data.failures.length > 0 &&
            ` — ${syncMutation.data.failures.length} falha(s)`}
          .
        </p>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {compounds
            ?.filter((c) => c.active)
            .map((compound, index) => (
              <Link
                key={compound.id}
                href={`/amostras/composto/${compound.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '14px 16px',
                  borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {compound.code} - {compound.name}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {countByCompound.get(compound.id) ?? 0} documento(s)
                </span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
