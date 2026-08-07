'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compoundsApi } from '../../../../../lib/api/compounds.api';
import { custodyDocumentsApi } from '../../../../../lib/api/custody-documents.api';
import { TableSkeleton } from '../../../../../components/shared/Skeleton';

const CURRENT_YEAR = new Date().getFullYear();

// Conteúdo de uma "pasta" de composto: lista os anos como subpastas (mesma
// organização usada hoje no OneDrive: Amostragem de Campo > composto > ano)
// em vez de listar todos os documentos de todos os anos numa única página —
// com centenas de PDFs por composto isso ficaria enorme. O upload em si fica
// aqui (não precisa entrar num ano específico pra anexar um PDF novo).
export default function CadeiaDeCustodiaDoCompostoPage() {
  const params = useParams<{ compoundId: string }>();
  const queryClient = useQueryClient();
  const [uploadYear, setUploadYear] = useState(String(CURRENT_YEAR));

  const { data: compounds } = useQuery({ queryKey: ['compounds'], queryFn: compoundsApi.list });
  const compound = compounds?.find((c) => c.id === params.compoundId);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['custody-documents', params.compoundId],
    queryFn: () => custodyDocumentsApi.list(params.compoundId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      custodyDocumentsApi.upload(
        { compoundId: params.compoundId, year: Number(uploadYear) },
        file,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custody-documents'] }),
  });

  const countByYear = new Map<number, number>();
  documents?.forEach((doc) => {
    countByYear.set(doc.year, (countByYear.get(doc.year) ?? 0) + 1);
  });
  const years = [...countByYear.keys()].sort((a, b) => b - a);

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/amostras" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Cadeia de Custódia
          </Link>{' '}
          / {compound ? `${compound.code} - ${compound.name}` : '...'}
        </h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ maxWidth: 140 }}>
            <label>Ano</label>
            <input
              type="number"
              className="input"
              value={uploadYear}
              onChange={(e) => setUploadYear(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Anexar PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = '';
              }}
              disabled={uploadMutation.isPending}
            />
          </div>
          {uploadMutation.isPending && <span style={{ fontSize: 13 }}>Enviando...</span>}
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : years.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          Nenhum documento de cadeia de custódia nesta pasta ainda.
        </p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {years.map((year, index) => (
            <Link
              key={year}
              href={`/amostras/composto/${params.compoundId}/ano/${year}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'inherit',
                padding: '14px 16px',
                borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>{year}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {countByYear.get(year)} documento(s)
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
