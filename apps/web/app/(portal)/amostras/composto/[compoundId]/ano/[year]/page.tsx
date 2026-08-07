'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compoundsApi } from '../../../../../../../lib/api/compounds.api';
import { custodyDocumentsApi } from '../../../../../../../lib/api/custody-documents.api';
import { TableSkeleton } from '../../../../../../../components/shared/Skeleton';

// Conteúdo de uma "subpasta" de ano dentro de um composto — os PDFs de
// cadeia de custódia daquele composto/ano específico.
export default function CadeiaDeCustodiaDoAnoPage() {
  const params = useParams<{ compoundId: string; year: string }>();
  const year = Number(params.year);
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: compounds } = useQuery({ queryKey: ['compounds'], queryFn: compoundsApi.list });
  const compound = compounds?.find((c) => c.id === params.compoundId);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['custody-documents', params.compoundId],
    queryFn: () => custodyDocumentsApi.list(params.compoundId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => custodyDocumentsApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['custody-documents'] });
    },
  });

  const documentsOfYear = documents?.filter((doc) => doc.year === year) ?? [];

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/amostras" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Cadeia de Custódia
          </Link>{' '}
          /{' '}
          <Link
            href={`/amostras/composto/${params.compoundId}`}
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            {compound ? `${compound.code} - ${compound.name}` : '...'}
          </Link>{' '}
          / {params.year}
        </h1>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : documentsOfYear.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Nenhum documento neste ano.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Enviado por</th>
                <th>Data de envio</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {documentsOfYear.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <a href={custodyDocumentsApi.viewUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                      {doc.filename}
                    </a>
                  </td>
                  <td>{doc.uploadedByName}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <a href={custodyDocumentsApi.viewUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                        Visualizar
                      </a>
                      <a href={custodyDocumentsApi.downloadUrl(doc.id)}>Baixar</a>

                      {pendingDeleteId !== doc.id ? (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '2px 10px', fontSize: 13 }}
                          onClick={() => setPendingDeleteId(doc.id)}
                        >
                          Excluir
                        </button>
                      ) : (
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 13 }}>Confirmar exclusão?</span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => deleteMutation.mutate(doc.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Cancelar
                          </button>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
