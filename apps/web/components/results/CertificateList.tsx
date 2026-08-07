'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { certificatesApi } from '../../lib/api/certificates.api';

interface CertificateListProps {
  sampleId: string;
  readOnly?: boolean;
}

export function CertificateList({ sampleId, readOnly }: CertificateListProps) {
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['certificates', sampleId],
    queryFn: () => certificatesApi.list(sampleId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['certificates', sampleId] });
  }

  const replaceMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => certificatesApi.replaceFile(id, file),
    onSuccess: () => {
      setReplacingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => certificatesApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      invalidate();
    },
  });

  if (isLoading) return <p style={{ fontSize: 13 }}>Carregando certificados...</p>;

  if (!certificates || certificates.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        Nenhum certificado anexado ainda.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {certificates.map((certificate) => (
        <div
          key={certificate.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: 8,
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{certificate.filename}</span>
            <span className="badge">v{certificate.version}</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)' }}>
            Laboratório: {certificate.laboratory} · Nº {certificate.certificateNumber}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            Análise: {new Date(certificate.analysisDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            {' · '}
            Certificado: {new Date(certificate.issueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </span>

          {certificate.extractedResults && certificate.extractedResults.length > 0 && (
            <div style={{ marginTop: 2 }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                Resultados lidos pela IA:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                {certificate.extractedResults.map((result) => (
                  <span key={result.label} style={{ fontSize: 12 }}>
                    <strong>{result.label}:</strong> {result.result}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
            <a
              href={certificatesApi.downloadUrl(certificate.id)}
              className="btn btn-primary"
              style={{ padding: '2px 8px', fontSize: 12, textDecoration: 'none' }}
            >
              Baixar
            </a>

            {!readOnly && (
              <>
                {replacingId !== certificate.id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => setReplacingId(certificate.id)}
                  >
                    Substituir
                  </button>
                )}
                {replacingId === certificate.id && (
                  <input
                    type="file"
                    accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) replaceMutation.mutate({ id: certificate.id, file });
                    }}
                    disabled={replaceMutation.isPending}
                  />
                )}

                {pendingDeleteId !== certificate.id ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => setPendingDeleteId(certificate.id)}
                  >
                    Excluir
                  </button>
                ) : (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>Confirmar?</span>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => deleteMutation.mutate(certificate.id)}
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
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
