'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicePhotosApi } from '../../lib/api/service-photos.api';
import { ApiError } from '../../lib/api/client';
import { Skeleton } from '../shared/Skeleton';

interface ServicePhotosSectionProps {
  scheduleId: string;
}

interface BatchUploadResult {
  succeeded: number;
  failures: { filename: string; message: string }[];
}

// "Fotos do Serviço": galeria geral da visita (inclusive fotos de
// amostras) — o técnico sobe tudo aqui em campo; na hora de gerar a cadeia
// de custódia (ver CustodyExtractionSection), escolhe uma dessas fotos pra
// entrar no PDF. Suporta selecionar várias fotos de uma vez (input
// multiple) e arrastar arquivos direto pra cima da área — cada arquivo vira
// uma chamada de upload independente (o backend só aceita um por vez), mas
// sequencial, pra dar pra mostrar "enviando X de Y" e não sobrecarregar o
// servidor local com várias requisições multipart em paralelo.
export function ServicePhotosSection({ scheduleId }: ServicePhotosSectionProps) {
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ['service-photos', scheduleId],
    queryFn: () => servicePhotosApi.list(scheduleId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['service-photos', scheduleId] });
  }

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<BatchUploadResult> => {
      const failures: BatchUploadResult['failures'] = [];
      let succeeded = 0;
      setProgress({ done: 0, total: files.length });
      for (const file of files) {
        try {
          await servicePhotosApi.upload(scheduleId, file);
          succeeded += 1;
        } catch (error) {
          failures.push({
            filename: file.name,
            message: error instanceof ApiError ? error.message : 'Falha no envio.',
          });
        }
        setProgress((current) => (current ? { ...current, done: current.done + 1 } : current));
      }
      return { succeeded, failures };
    },
    onSuccess: () => {
      setProgress(null);
      invalidate();
    },
    onError: () => setProgress(null),
  });

  function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (files.length > 0) uploadMutation.mutate(files);
  }

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => servicePhotosApi.delete(photoId),
    onSuccess: () => {
      setPendingDeleteId(null);
      invalidate();
    },
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Fotos do Serviço</h3>
        <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
          {uploadMutation.isPending ? 'Enviando...' : 'Adicionar fotos'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            style={{ display: 'none' }}
            disabled={uploadMutation.isPending}
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 6,
          padding: 16,
          marginBottom: 12,
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          background: isDragging ? 'var(--color-bg)' : 'transparent',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {progress
          ? `Enviando ${progress.done} de ${progress.total}...`
          : 'Arraste fotos aqui, ou use "Adicionar fotos" (dá pra selecionar várias de uma vez)'}
      </div>

      {uploadMutation.isSuccess && uploadMutation.data.failures.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>
          {uploadMutation.data.succeeded} foto(s) enviada(s), {uploadMutation.data.failures.length}{' '}
          falharam: {uploadMutation.data.failures.map((f) => f.filename).join(', ')}
        </p>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }} aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={120} height={120} />
          ))}
        </div>
      ) : !photos || photos.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Nenhuma foto enviada ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                width: 140,
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <a href={servicePhotosApi.fileUrl(photo.id)} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={servicePhotosApi.fileUrl(photo.id)}
                  alt={photo.filename}
                  style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                />
              </a>
              <div style={{ padding: 6, fontSize: 11 }}>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {new Date(photo.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </div>
                {pendingDeleteId === photo.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '1px 6px', fontSize: 11 }}
                      onClick={() => deleteMutation.mutate(photo.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '1px 6px', fontSize: 11 }}
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '1px 6px', fontSize: 11 }}
                    onClick={() => setPendingDeleteId(photo.id)}
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
