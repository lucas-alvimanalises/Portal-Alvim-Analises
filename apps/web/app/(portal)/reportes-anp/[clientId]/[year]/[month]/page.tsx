'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { anpMonthlyReportsApi } from '../../../../../../lib/api/anp-monthly-reports.api';
import { useCurrentUser } from '../../../../../../lib/auth/useCurrentUser';
import { ApiError } from '../../../../../../lib/api/client';
import { ComplianceStatusIndicator, getComplianceRowStyle } from '../../../../../../components/shared/ComplianceStatusIndicator';
import { TableSkeleton } from '../../../../../../components/shared/Skeleton';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Nível 3: os 3 parâmetros do mês (Siloxanos/Fluorados/Clorados), limite
// regulatório ao lado, situação de conformidade, botão de gerar/regenerar
// e histórico de versões — tudo já calculado automaticamente pelo backend
// a partir dos certificados aprovados (sem digitação manual nenhuma aqui).
export default function ReportesAnpMesPage() {
  const params = useParams<{ clientId: string; year: string; month: string }>();
  const year = Number(params.year);
  const month = Number(params.month);
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.MANAGER;
  const canDelete = me?.role === Role.ADMIN;
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['anp-monthly-reports', 'month', params.clientId, year, month],
    queryFn: () => anpMonthlyReportsApi.getMonth(params.clientId, year, month),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['anp-monthly-reports', 'month', params.clientId, year, month] });
    queryClient.invalidateQueries({ queryKey: ['anp-monthly-reports', 'months', params.clientId] });
    queryClient.invalidateQueries({ queryKey: ['anp-monthly-reports', 'eligible-clients'] });
    queryClient.invalidateQueries({ queryKey: ['anp-monthly-reports', 'summary'] });
  }

  const generateMutation = useMutation({
    mutationFn: () => anpMonthlyReportsApi.generate(params.clientId, year, month),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => anpMonthlyReportsApi.deleteVersion(reportId),
    onSuccess: () => {
      setPendingDeleteId(null);
      invalidate();
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/reportes-anp" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Reportes Mensais ANP
          </Link>{' '}
          /{' '}
          <Link
            href={`/reportes-anp/${params.clientId}`}
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            {detail?.clientName ?? '...'}
          </Link>{' '}
          / {MONTH_NAMES_PT[month - 1]} de {year}
        </h1>
      </div>

      {isLoading || !detail ? (
        <TableSkeleton />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
              <span>
                <strong>CNPJ:</strong> {detail.cnpj}
              </span>
              <span>
                <strong>Ponto de amostragem:</strong> {detail.samplingPointName ?? '-'}
              </span>
              <span>
                <strong>Responsável técnico:</strong>{' '}
                {detail.technicianNames.length > 0 ? detail.technicianNames.join(', ') : '-'}
              </span>
            </div>
          </div>

          {detail.isStale && (
            <div
              className="card"
              style={{ background: '#fef9c3', color: '#854d0e', marginBottom: 16, fontSize: 13 }}
            >
              Existem alterações nas análises deste mês. Recomenda-se gerar uma nova versão do Reporte ANP.
            </div>
          )}

          {detail.rows.length === 0 ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                Ainda não há resultados suficientes (Siloxanos, Somatório de Fluorados e Somatório de
                Clorados) na 1ª Barreira (ANP) para este mês.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, marginBottom: 16, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Data', 'Parâmetro', 'Resultado', 'Limite Regulatório ANP', 'Situação'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((row, index) => (
                    <tr
                      key={`${row.parameter}-${row.date}-${index}`}
                      style={getComplianceRowStyle(row.compliance)}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {new Date(row.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.label}</td>
                      <td style={{ padding: '10px 14px' }}>{row.result}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {row.regulatoryLimit.toFixed(2).replace('.', ',')} {row.unit}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <ComplianceStatusIndicator compliance={row.compliance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage && detail.rows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending
                  ? 'Gerando...'
                  : detail.currentReport
                    ? `Gerar Nova Versão (v${detail.currentReport.version + 1})`
                    : 'Gerar Reporte'}
              </button>
              {generateMutation.isError && (
                <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>
                  {generateMutation.error instanceof ApiError
                    ? generateMutation.error.message
                    : 'Não foi possível gerar o reporte.'}
                </p>
              )}
            </div>
          )}

          <div className="card">
            <h2 style={{ margin: '0 0 12px', fontSize: 15 }}>Histórico de versões</h2>
            {detail.history.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 13 }}>
                Nenhum reporte gerado ainda para este mês.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {detail.history.map((report, index) => (
                  <div
                    key={report.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <strong>v{report.version}</strong> — nº{' '}
                      {String(report.reportNumber).padStart(5, '0')} · gerado por {report.generatedByName} em{' '}
                      {new Date(report.createdAt).toLocaleString('pt-BR')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <a
                        href={anpMonthlyReportsApi.fileUrl(report.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                      >
                        Baixar
                      </a>
                      {canDelete &&
                        (pendingDeleteId === report.id ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => deleteMutation.mutate(report.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setPendingDeleteId(null)}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setPendingDeleteId(report.id)}
                          >
                            Excluir
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
