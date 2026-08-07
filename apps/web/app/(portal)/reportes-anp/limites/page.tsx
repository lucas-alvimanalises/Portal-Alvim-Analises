'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnpRegulatoryLimitDto, Role } from '@portal-alvim/shared';
import { anpMonthlyReportsApi } from '../../../../lib/api/anp-monthly-reports.api';
import { useCurrentUser } from '../../../../lib/auth/useCurrentUser';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

// Tela de configuração dos 3 limites regulatórios usados no Reporte ANP —
// tabela dedicada (AnpRegulatoryLimit), editável só por Admin/Gestor, sem
// precisar mexer em código pra ajustar um valor (pedido explícito do
// usuário).
export default function LimitesRegulatoriosAnpPage() {
  const { data: me } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { regulatoryLimit: string; unit: string }>>({});

  useEffect(() => {
    if (me && me.role === Role.CLIENT) {
      router.replace('/reportes-anp');
    }
  }, [me, router]);

  const { data: limits, isLoading } = useQuery({
    queryKey: ['anp-monthly-reports', 'regulatory-limits'],
    queryFn: anpMonthlyReportsApi.getRegulatoryLimits,
  });

  useEffect(() => {
    if (limits && Object.keys(drafts).length === 0) {
      const initial: Record<string, { regulatoryLimit: string; unit: string }> = {};
      limits.forEach((l) => {
        initial[l.parameter] = { regulatoryLimit: String(l.regulatoryLimit).replace('.', ','), unit: l.unit };
      });
      setDrafts(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limits]);

  const saveMutation = useMutation({
    mutationFn: () =>
      anpMonthlyReportsApi.updateRegulatoryLimits(
        (limits ?? []).map((l) => ({
          parameter: l.parameter,
          regulatoryLimit: Number((drafts[l.parameter]?.regulatoryLimit ?? '0').replace(',', '.')) || 0,
          unit: drafts[l.parameter]?.unit ?? l.unit,
        })),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(['anp-monthly-reports', 'regulatory-limits'], updated);
    },
  });

  function updateDraft(parameter: string, field: 'regulatoryLimit' | 'unit', value: string) {
    setDrafts((current) => ({
      ...current,
      [parameter]: { ...current[parameter], [field]: value },
    }));
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/reportes-anp" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Reportes Mensais ANP
          </Link>{' '}
          / Limites Regulatórios
        </h1>
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: -8 }}>
        Limites usados pra calcular a situação de conformidade (🟢/🔴) de todos os Reportes ANP gerados a
        partir de agora. Alterar aqui não muda reportes já gerados anteriormente.
      </p>

      {isLoading || !limits ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {limits.map((limit: AnpRegulatoryLimitDto) => (
              <div key={limit.parameter} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 2 }}>
                  <label>{limit.label}</label>
                  <input
                    className="input"
                    value={drafts[limit.parameter]?.regulatoryLimit ?? ''}
                    onChange={(e) => updateDraft(limit.parameter, 'regulatoryLimit', e.target.value)}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Unidade</label>
                  <input
                    className="input"
                    value={drafts[limit.parameter]?.unit ?? ''}
                    onChange={(e) => updateDraft(limit.parameter, 'unit', e.target.value)}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', paddingBottom: 10 }}>
                  {limit.updatedByName ? `Atualizado por ${limit.updatedByName}` : ''}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            {saveMutation.isSuccess && (
              <span style={{ color: 'var(--color-primary)', fontSize: 13 }}>✓ Salvo</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
