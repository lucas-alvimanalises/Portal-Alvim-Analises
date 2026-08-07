'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlantMaintenanceDto } from '@portal-alvim/shared';
import { plantMaintenancesApi } from '../../lib/api/plant-maintenances.api';
import { ApiError } from '../../lib/api/client';

interface PlantMaintenanceAttachmentsProps {
  maintenance: PlantMaintenanceDto;
}

// Anexos da manutenção (laudos, fotos, relatórios) — mesmo padrão de upload
// de ServicePhotosSection.tsx, mas sem restringir a imagens (aqui também
// entra PDF) e sem preview de miniatura, só a lista com nome/tamanho.
export function PlantMaintenanceAttachments({ maintenance }: PlantMaintenanceAttachmentsProps) {
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['plant-maintenance', maintenance.id] });
    queryClient.invalidateQueries({ queryKey: ['plant-maintenances', maintenance.clientId] });
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => plantMaintenancesApi.uploadAttachment(maintenance.id, file),
    onSuccess: () => {
      setUploadError(null);
      invalidate();
    },
    onError: (error) => {
      setUploadError(error instanceof ApiError ? error.message : 'Falha no envio do arquivo.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => plantMaintenancesApi.removeAttachment(attachmentId),
    onSuccess: () => {
      setPendingDeleteId(null);
      invalidate();
    },
  });

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15 }}>Anexos</h2>
        <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
          {uploadMutation.isPending ? 'Enviando...' : 'Adicionar anexo'}
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

      {uploadError && (
        <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 0 }}>{uploadError}</p>
      )}

      {maintenance.attachments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Nenhum anexo enviado ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {maintenance.attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <a
                href={plantMaintenancesApi.attachmentFileUrl(attachment.id)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, color: 'inherit' }}
              >
                {attachment.filename}
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {formatSize(attachment.sizeBytes)} · {attachment.uploadedByName}
                </span>
                {pendingDeleteId === attachment.id ? (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => deleteMutation.mutate(attachment.id)}
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
                    onClick={() => setPendingDeleteId(attachment.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
