'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicePhotosApi } from '../../lib/api/service-photos.api';
import { fieldReportsApi } from '../../lib/api/field-reports.api';
import { ApiError } from '../../lib/api/client';

const MAX_PHOTOS = 4;

interface FieldReportModalProps {
  scheduleId: string;
  isRegenerate: boolean;
  onClose: () => void;
}

// Escolher até 4 fotos já enviadas em "Fotos do Serviço" pra entrar no PDF
// do Relatório de Campo (grade 2x2) — não faz upload nenhum aqui, só
// reaproveita o que já foi enviado antes (ver ServicePhotosSection).
export function FieldReportModal({ scheduleId, isRegenerate, onClose }: FieldReportModalProps) {
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: photos, isLoading } = useQuery({
    queryKey: ['service-photos', scheduleId],
    queryFn: () => servicePhotosApi.list(scheduleId),
  });

  const generateMutation = useMutation({
    mutationFn: () => fieldReportsApi.generate(scheduleId, selectedPhotoIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-report', scheduleId] });
      window.open(fieldReportsApi.fileUrl(scheduleId), '_blank');
      onClose();
    },
  });

  function togglePhoto(photoId: string) {
    setSelectedPhotoIds((current) => {
      if (current.includes(photoId)) return current.filter((id) => id !== photoId);
      if (current.length >= MAX_PHOTOS) return current;
      return [...current, photoId];
    });
  }

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
      <div className="card" style={{ width: 560, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>
          {isRegenerate ? 'Gerar Nova Versão do Relatório de Campo' : 'Gerar Relatório de Campo'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          Escolha até {MAX_PHOTOS} fotos já enviadas em &quot;Fotos do Serviço&quot; para entrarem
          no relatório (opcional — pode gerar sem nenhuma foto também).
        </p>
        {isRegenerate && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Já existe um relatório gerado para este serviço — gerar novamente substitui o PDF
            atual (o cliente passa a ver esta nova versão).
          </p>
        )}

        {isLoading ? (
          <p style={{ fontSize: 13 }}>Carregando fotos...</p>
        ) : !photos || photos.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Nenhuma foto enviada ainda. Envie fotos em &quot;Fotos do Serviço&quot; primeiro, ou
            gere o relatório sem fotos.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {selectedPhotoIds.length}/{MAX_PHOTOS} selecionadas
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {photos.map((photo) => {
                const selected = selectedPhotoIds.includes(photo.id);
                const disabled = !selected && selectedPhotoIds.length >= MAX_PHOTOS;
                return (
                  <label
                    key={photo.id}
                    style={{
                      position: 'relative',
                      border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 6,
                      overflow: 'hidden',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => togglePhoto(photo.id)}
                      style={{ position: 'absolute', top: 6, left: 6, zIndex: 1 }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={servicePhotosApi.fileUrl(photo.id)}
                      alt={photo.filename}
                      style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                    />
                  </label>
                );
              })}
            </div>
          </>
        )}

        {generateMutation.isError && (
          <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 8 }}>
            {generateMutation.error instanceof ApiError
              ? generateMutation.error.message
              : 'Não foi possível gerar o relatório.'}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending
              ? 'Gerando...'
              : isRegenerate
                ? 'Gerar Nova Versão'
                : 'Gerar Relatório de Campo'}
          </button>
        </div>
      </div>
    </div>
  );
}
