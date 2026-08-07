'use client';

import { useEffect, useRef, useState } from 'react';
import { certificatesApi } from '../../lib/api/certificates.api';
import { custodyExtractionsApi } from '../../lib/api/custody-extractions.api';

interface BulkDownloadButtonProps {
  selectedSampleIds: string[];
}

// Extrai o nome de arquivo do Content-Disposition (mesmo formato usado em
// todos os endpoints de download deste backend: `attachment;
// filename="...encodeURIComponent..."`).
function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match ? decodeURIComponent(match[1]) : fallback;
}

// fetch+blob em vez de um <a href> direto: uma amostra sem cadeia aprovada
// ou sem certificado responde 404, e um <a> normal navegaria a aba inteira
// pra essa resposta de erro (sem Content-Disposition não é reconhecida como
// download) — o que abandonaria a página de Resultados no meio do lote.
// Com blob, uma resposta não-OK só falha essa chamada, sem navegar nada.
async function fetchAndDownload(url: string): Promise<boolean> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) return false;

  const blob = await response.blob();
  const filename = filenameFromContentDisposition(response.headers.get('Content-Disposition'), 'arquivo');
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
  return true;
}

// Cadeia de custódia e certificado, um ou os dois, pra todas as amostras
// selecionadas nos checkboxes de AnalysisSlot. Amostras sem cadeia aprovada
// ou sem certificado simplesmente não baixam nada pra aquele item — não há
// como saber de antemão sem uma consulta extra por amostra, e travar a ação
// inteira por causa de 1 item faltando seria pior (confirmado com o
// usuário: cliente tem acesso só a alguns certificados). Mostra ao final
// quantos itens não estavam disponíveis, se algum faltou.
export function BulkDownloadButton({ selectedSampleIds }: BulkDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hasSelection = selectedSampleIds.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleDownload(kind: 'custody' | 'certificate' | 'both') {
    setIsOpen(false);
    setIsDownloading(true);
    setMissingCount(null);
    let missing = 0;
    try {
      for (const sampleId of selectedSampleIds) {
        if (kind === 'custody' || kind === 'both') {
          const ok = await fetchAndDownload(custodyExtractionsApi.downloadBySampleUrl(sampleId));
          if (!ok) missing += 1;
        }
        if (kind === 'certificate' || kind === 'both') {
          const ok = await fetchAndDownload(certificatesApi.downloadBySampleUrl(sampleId));
          if (!ok) missing += 1;
        }
      }
    } finally {
      setIsDownloading(false);
      setMissingCount(missing);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      {missingCount !== null && missingCount > 0 && (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {missingCount} arquivo(s) não disponível(is)
        </span>
      )}
      <button
        type="button"
        className="btn btn-primary"
        disabled={!hasSelection || isDownloading}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isDownloading
          ? 'Baixando...'
          : `Baixar selecionados${hasSelection ? ` (${selectedSampleIds.length})` : ''}`}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 20,
            marginTop: 4,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: 220,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => handleDownload('custody')}
          >
            Apenas cadeia de custódia
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => handleDownload('certificate')}
          >
            Apenas certificado
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => handleDownload('both')}
          >
            Baixar os dois
          </button>
        </div>
      )}
    </div>
  );
}
