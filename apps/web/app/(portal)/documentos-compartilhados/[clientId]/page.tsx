'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { clientsApi } from '../../../../lib/api/clients.api';
import { sharedDocumentsApi } from '../../../../lib/api/shared-documents.api';
import { useCurrentUser } from '../../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../../lib/auth/ActiveClientContext';
import { ApiError } from '../../../../lib/api/client';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Nível 2: pasta de documentos desta empresa — ADMIN/MANAGER e o próprio
// CLIENT sobem e baixam arquivos aqui (pedido do usuário). Exclusão fica
// restrita: ADMIN/MANAGER apagam qualquer documento, CLIENT só o que ele
// mesmo enviou (mesma regra já aplicada no backend, ver
// SharedDocumentsService — canDelete aqui é só pra não mostrar um botão que
// o servidor recusaria).
export default function DocumentosCompartilhadosEmpresaPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const { activeClientId } = useActiveClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Mesmo cuidado de Manutenção da Planta/Histórico: se o CLIENT trocar de
  // empresa no seletor do topo enquanto está dentro desta pasta, realinha.
  useEffect(() => {
    if (isClient && activeClientId && activeClientId !== params.clientId) {
      router.replace(`/documentos-compartilhados/${activeClientId}`);
    }
  }, [isClient, activeClientId, params.clientId, router]);

  const { data: client } = useQuery({
    queryKey: ['clients', params.clientId],
    queryFn: () => clientsApi.get(params.clientId),
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['shared-documents', params.clientId],
    queryFn: () => sharedDocumentsApi.list(params.clientId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => sharedDocumentsApi.upload(params.clientId, file),
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['shared-documents', params.clientId] });
    },
    onError: (error) => {
      setUploadError(error instanceof ApiError ? error.message : 'Falha no envio do arquivo.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sharedDocumentsApi.remove(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['shared-documents', params.clientId] });
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link
            href="/documentos-compartilhados"
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            Documentos Compartilhados
          </Link>{' '}
          / {client?.companyName ?? '...'}
        </h1>
        <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
          {uploadMutation.isPending ? 'Enviando...' : 'Adicionar documento'}
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            disabled={uploadMutation.isPending}
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              files.forEach((file) => uploadMutation.mutate(file));
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: -8, marginBottom: 12 }}>
        Aceita qualquer tipo de arquivo, incluindo pastas compactadas (.zip).
      </p>

      {uploadError && (
        <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 0 }}>{uploadError}</p>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {documents?.map((doc, index) => {
            const canDelete = !isClient || doc.uploadedById === me?.id;
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <a
                  href={sharedDocumentsApi.fileUrl(doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 14, color: 'inherit', fontWeight: 600 }}
                >
                  {doc.filename}
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {formatSize(doc.sizeBytes)} · {doc.uploadedByName}
                    {' · '}
                    <span
                      className="badge"
                      style={{
                        background: doc.uploadedByRole === Role.CLIENT ? '#e0f2fe' : '#dcfce7',
                        color: doc.uploadedByRole === Role.CLIENT ? '#0369a1' : '#166534',
                      }}
                    >
                      {doc.uploadedByRole === Role.CLIENT ? 'Cliente' : 'Alvim'}
                    </span>
                  </span>
                  {canDelete &&
                    (pendingDeleteId === doc.id ? (
                      <span style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => deleteMutation.mutate(doc.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => setPendingDeleteId(null)}
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '2px 8px', fontSize: 12 }}
                        onClick={() => setPendingDeleteId(doc.id)}
                      >
                        Excluir
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
          {documents?.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>
              Nenhum documento compartilhado ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
