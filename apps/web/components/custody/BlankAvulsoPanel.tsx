'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CUSTODY_BLANK_AVULSO_MAX_COPIES } from '@portal-alvim/shared';
import { custodyExtractionsApi } from '../../lib/api/custody-extractions.api';

// Painel "Imprimir Cadeias de Custódia Avulso" — abre embaixo do cabeçalho
// da tela de Cadeia de Custódia. Lista todos os modelos cadastrados, o
// usuário escolhe quantas cópias em branco de cada quer, e o botão gera um
// PDF único (uma cópia por página) pra imprimir e levar a campo já pronto —
// sem vínculo com nenhum agendamento (ver DownloadBlankAvulsoCustodyChainsUseCase).
export function BlankAvulsoPanel({ onClose }: { onClose: () => void }) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['custody-blank-templates'],
    queryFn: custodyExtractionsApi.listBlankTemplates,
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const total = useMemo(
    () => Object.values(quantities).reduce((sum, n) => sum + (n || 0), 0),
    [quantities],
  );
  const overLimit = total > CUSTODY_BLANK_AVULSO_MAX_COPIES;

  function setQty(compoundId: string, raw: string) {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setQuantities((current) => ({ ...current, [compoundId]: n }));
  }

  function generate() {
    const items = (templates ?? []).map((t) => ({
      compoundId: t.compoundId,
      quantity: quantities[t.compoundId] ?? 0,
    }));
    window.open(custodyExtractionsApi.blankAvulsoUrl(items), '_blank');
  }

  return (
    <div className="card" style={{ marginBottom: 20, maxWidth: 460 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <strong style={{ fontSize: 14 }}>Imprimir Cadeias de Custódia Avulso</strong>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 12 }}>
        Quantas cópias em branco de cada modelo você quer imprimir?
      </p>

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Carregando modelos…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates?.map((t) => (
            <div
              key={t.compoundId}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
            >
              <span style={{ fontSize: 13 }}>
                {t.compoundCode} - {t.compoundName}
              </span>
              <input
                type="number"
                min={0}
                className="input"
                style={{ width: 72, textAlign: 'center', padding: '4px 6px' }}
                value={quantities[t.compoundId] ?? 0}
                onChange={(e) => setQty(t.compoundId, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {overLimit && (
        <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 12, marginBottom: 0 }}>
          Máximo de {CUSTODY_BLANK_AVULSO_MAX_COPIES} cópias por PDF. Gere em lotes menores.
        </p>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          Total: {total} {total === 1 ? 'cópia' : 'cópias'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {total > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => setQuantities({})}>
              Limpar
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={total === 0 || overLimit}
            onClick={generate}
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
