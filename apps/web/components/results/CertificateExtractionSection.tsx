'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CertificateExtractionStatus } from '@portal-alvim/shared';
import { certificateExtractionsApi } from '../../lib/api/certificate-extractions.api';
import { certificatesApi } from '../../lib/api/certificates.api';
import { ApiError } from '../../lib/api/client';
import { CertificateUploader } from './CertificateUploader';

interface CertificateExtractionSectionProps {
  sampleId: string;
  // Leitura por IA depende do CertificateAnalyteTemplate do composto — sem
  // composto definido (registros antigos), só a opção manual fica disponível.
  hasCompound: boolean;
  // Opcional: ver mesmo campo em CertificateUploaderProps.
  onUploaded?: () => void;
}

const STATUS_LABELS_PT: Record<CertificateExtractionStatus, string> = {
  PROCESSING: 'Lendo com IA...',
  NEEDS_REVIEW: 'Aguardando revisão',
  APPROVED: 'Aprovado',
  FAILED: 'Falha na leitura',
};

// Ponto de entrada único pra anexar o certificado de uma amostra: por
// leitura automática (IA) ou preenchendo os campos à mão — mesmo padrão de
// duas opções do CustodyExtractionSection. Só um certificado por amostra
// (regra confirmada com o usuário): some assim que um já existe, sobrando
// só Substituir/Excluir no card em CertificateList.
export function CertificateExtractionSection({ sampleId, hasCompound, onUploaded }: CertificateExtractionSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showOptions, setShowOptions] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: certificates } = useQuery({
    queryKey: ['certificates', sampleId],
    queryFn: () => certificatesApi.list(sampleId),
  });

  const { data: extractions } = useQuery({
    queryKey: ['certificate-extractions', sampleId],
    queryFn: () => certificateExtractionsApi.listBySample(sampleId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['certificate-extractions', sampleId] });
    queryClient.invalidateQueries({ queryKey: ['certificates', sampleId] });
    queryClient.invalidateQueries({ queryKey: ['samples'] });
    onUploaded?.();
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => certificateExtractionsApi.upload(sampleId, file),
    onSuccess: (extraction) => {
      invalidate();
      router.push(`/certificado/${extraction.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => certificateExtractionsApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      invalidate();
    },
  });

  // Já tendo um certificado cadastrado (o único permitido por amostra), não
  // mostra mais nenhuma opção de anexar — só o card existente com
  // Substituir/Excluir (ver CertificateList.tsx).
  if (certificates === undefined) return null;
  if (certificates.length > 0) return null;

  const pendingExtractions = (extractions ?? []).filter((extraction) => extraction.status !== 'APPROVED');
  const hasPendingExtraction = pendingExtractions.some(
    (extraction) => extraction.status === 'PROCESSING' || extraction.status === 'NEEDS_REVIEW',
  );
  const error = uploadMutation.error ?? deleteMutation.error;

  return (
    <div style={{ marginBottom: 8 }}>
      {pendingExtractions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {pendingExtractions.map((extraction) => (
            <div
              key={extraction.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '6px 10px',
              }}
            >
              <span>
                {extraction.originalScanFilename} —{' '}
                <span className="badge">{STATUS_LABELS_PT[extraction.status]}</span>
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <a href={`/certificado/${extraction.id}`}>
                  {extraction.status === 'NEEDS_REVIEW' ? 'Revisar leitura' : 'Ver'}
                </a>
                {pendingDeleteId === extraction.id ? (
                  <>
                    <span>Excluir?</span>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '1px 8px', fontSize: 12 }}
                      onClick={() => deleteMutation.mutate(extraction.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Excluindo...' : 'Sim'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '1px 8px', fontSize: 12 }}
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '1px 8px', fontSize: 12 }}
                    onClick={() => setPendingDeleteId(extraction.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasPendingExtraction && !showOptions && !showManualForm && (
        <button type="button" className="btn btn-primary" onClick={() => setShowOptions(true)}>
          Anexar certificado
        </button>
      )}

      {!hasPendingExtraction && showOptions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {hasCompound && (
            <label
              className="btn btn-secondary"
              style={{ cursor: uploadMutation.isPending ? 'default' : 'pointer', margin: 0 }}
            >
              {uploadMutation.isPending ? 'Lendo certificado...' : 'Via leitura automática (IA)'}
              <input
                type="file"
                accept="application/pdf,image/*"
                capture="environment"
                style={{ display: 'none' }}
                disabled={uploadMutation.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowOptions(false);
              setShowManualForm(true);
            }}
            disabled={uploadMutation.isPending}
          >
            Preencher manualmente
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowOptions(false)}
            disabled={uploadMutation.isPending}
          >
            Cancelar
          </button>
        </div>
      )}

      {showManualForm && (
        <div>
          <CertificateUploader sampleId={sampleId} onUploaded={onUploaded} />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 8 }}
            onClick={() => setShowManualForm(false)}
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 6 }}>
          {error instanceof ApiError ? error.message : 'Não foi possível completar a ação.'}
        </p>
      )}
    </div>
  );
}
