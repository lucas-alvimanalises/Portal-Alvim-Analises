'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CustodyExtractionStatus } from '@portal-alvim/shared';
import { custodyExtractionsApi } from '../../lib/api/custody-extractions.api';
import { custodyDocumentsApi } from '../../lib/api/custody-documents.api';
import { ApiError } from '../../lib/api/client';

interface CustodyExtractionSectionProps {
  sampleId: string;
}

const STATUS_LABELS_PT: Record<CustodyExtractionStatus, string> = {
  PROCESSING: 'Processando...',
  NEEDS_REVIEW: 'Aguardando revisão',
  APPROVED: 'Aprovada',
  FAILED: 'Falha na leitura',
};

// Ponto de entrada pra gerar a cadeia de custódia: ou por digitalização
// inteligente (técnico fotografa/escaneia o papel, a IA lê os campos) ou
// preenchendo os campos direto na tela de conferência, sem escaneado
// nenhum. Os dois caminhos terminam na mesma tela (/cadeia-custodia/:id).
export function CustodyExtractionSection({ sampleId }: CustodyExtractionSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showOptions, setShowOptions] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: extractions } = useQuery({
    queryKey: ['custody-extractions', sampleId],
    queryFn: () => custodyExtractionsApi.listBySample(sampleId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['custody-extractions', sampleId] });
    // Apagar uma extração aprovada também apaga o CustodyDocument
    // correspondente (ver DeleteCustodyExtractionUseCase) — atualiza
    // qualquer pasta de cadeia de custódia já carregada.
    queryClient.invalidateQueries({ queryKey: ['custody-documents'] });
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => custodyExtractionsApi.upload(sampleId, file),
    onSuccess: (extraction) => {
      invalidate();
      router.push(`/cadeia-custodia/${extraction.id}`);
    },
  });

  const manualMutation = useMutation({
    mutationFn: () => custodyExtractionsApi.createManual(sampleId),
    onSuccess: (extraction) => {
      invalidate();
      router.push(`/cadeia-custodia/${extraction.id}`);
    },
  });

  // Já vem pronta (feita fora da plataforma) e já entra aprovada — sem
  // revisão, então não redireciona pra tela de conferência.
  const attachExistingMutation = useMutation({
    mutationFn: (file: File) => custodyExtractionsApi.attachExisting(sampleId, file),
    onSuccess: () => {
      invalidate();
      setShowOptions(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => custodyExtractionsApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      invalidate();
    },
  });

  const isBusy = uploadMutation.isPending || manualMutation.isPending || attachExistingMutation.isPending;
  const error =
    uploadMutation.error ?? manualMutation.error ?? attachExistingMutation.error ?? deleteMutation.error;
  // Só uma cadeia de custódia por amostra — uma tentativa que falhou não
  // conta contra esse limite (o backend segue a mesma regra, ver
  // assertNoActiveCustodyExtraction.util.ts).
  const hasActiveExtraction = (extractions ?? []).some((extraction) => extraction.status !== 'FAILED');

  return (
    <div>
      <h4 style={{ marginBottom: 6, fontSize: 14 }}>Cadeia de Custódia</h4>

      {extractions && extractions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {extractions.map((extraction) => (
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
                {extraction.originalScanFilename ?? 'Preenchida manualmente'} —{' '}
                <span className="badge">{STATUS_LABELS_PT[extraction.status]}</span>
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {extraction.status === 'APPROVED' ? (
                  <>
                    <a href={`/cadeia-custodia/${extraction.id}`}>Ver preenchimento</a>
                    {extraction.generatedDocumentId && (
                      <a
                        href={custodyDocumentsApi.viewUrl(extraction.generatedDocumentId)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver PDF gerado
                      </a>
                    )}
                  </>
                ) : (
                  <a href={`/cadeia-custodia/${extraction.id}`}>Abrir revisão</a>
                )}
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

      {hasActiveExtraction ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Esta amostra já tem uma cadeia de custódia cadastrada — só é possível gerar outra se a
          tentativa atual falhar.
        </p>
      ) : !showOptions ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowOptions(true)}
        >
          Gerar Cadeia de Custódia
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            {uploadMutation.isPending ? 'Enviando...' : 'Via digitalização (IA)'}
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              style={{ display: 'none' }}
              disabled={isBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => manualMutation.mutate()}
            disabled={isBusy}
          >
            {manualMutation.isPending ? 'Criando...' : 'Preencher manualmente'}
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            {attachExistingMutation.isPending ? 'Enviando...' : 'Anexar cadeia já pronta'}
            <input
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              disabled={isBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) attachExistingMutation.mutate(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowOptions(false)}
            disabled={isBusy}
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
