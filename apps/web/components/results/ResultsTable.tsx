'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ComplianceStatus,
  COMPLIANCE_STATUS_LABELS_PT,
  ResultRowInput,
  SampleResultRowDto,
} from '@portal-alvim/shared';
import { samplesApi } from '../../lib/api/samples.api';
import { ComplianceStatusIndicator, getComplianceRowStyle } from '../shared/ComplianceStatusIndicator';

interface ResultsTableProps {
  sampleId: string;
  initialRows: SampleResultRowDto[];
  readOnly?: boolean;
}

function toRowInput(row: SampleResultRowDto | ResultRowInput, order: number): ResultRowInput {
  return {
    parameterName: row.parameterName,
    result: row.result,
    unit: row.unit,
    specLimit: row.specLimit ?? undefined,
    compliance: row.compliance ?? undefined,
    notes: row.notes ?? undefined,
    order,
  };
}

// Tabela de resultados por composto medido dentro de uma análise (Sample).
// Edição local + "Salvar" substitui o conjunto inteiro no backend (PUT
// /samples/:id/results) — mesmo padrão de "apaga e recria" usado em outras
// listas do app (pontos de amostragem, técnicos, empresas de um usuário).
export function ResultsTable({ sampleId, initialRows, readOnly }: ResultsTableProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ResultRowInput[]>(
    initialRows.map((row, index) => toRowInput(row, index)),
  );

  const saveMutation = useMutation({
    mutationFn: () => samplesApi.replaceResultRows(sampleId, { rows }),
    onSuccess: (sample) => {
      setRows(sample.resultRows.map((row, index) => toRowInput(row, index)));
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });

  function updateRow(index: number, patch: Partial<ResultRowInput>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { parameterName: '', result: '', unit: '', order: current.length },
    ]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index).map((row, i) => ({ ...row, order: i })));
  }

  if (readOnly) {
    return (
      <table style={{ fontSize: 13 }}>
        <thead>
          <tr>
            <th>Composto</th>
            <th>Resultado</th>
            <th>Unidade</th>
            <th>Limite</th>
            <th>Situação</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} style={getComplianceRowStyle(row.compliance ?? null)}>
              <td>{row.parameterName}</td>
              <td>{row.result}</td>
              <td>{row.unit}</td>
              <td>{row.specLimit ?? '-'}</td>
              <td>
                <ComplianceStatusIndicator compliance={row.compliance ?? null} />
              </td>
              <td>{row.notes ?? ''}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: 'var(--color-text-muted)' }}>
                Nenhum composto adicionado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div>
      <table style={{ fontSize: 13 }}>
        <thead>
          <tr>
            <th>Composto</th>
            <th>Resultado</th>
            <th>Unidade</th>
            <th>Limite</th>
            <th>Situação</th>
            <th>Observações</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  className="input"
                  style={{ minWidth: 90 }}
                  value={row.parameterName}
                  onChange={(e) => updateRow(index, { parameterName: e.target.value })}
                  placeholder="D4, Benzeno..."
                />
              </td>
              <td>
                <input
                  className="input"
                  style={{ minWidth: 80 }}
                  value={row.result}
                  onChange={(e) => updateRow(index, { result: e.target.value })}
                  placeholder="2,35 ou < 0,01"
                />
              </td>
              <td>
                <input
                  className="input"
                  style={{ minWidth: 70 }}
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                  placeholder="mg/m³"
                />
              </td>
              <td>
                <input
                  className="input"
                  style={{ minWidth: 70 }}
                  value={row.specLimit ?? ''}
                  onChange={(e) => updateRow(index, { specLimit: e.target.value || undefined })}
                />
              </td>
              <td>
                <select
                  className="input"
                  value={row.compliance ?? ''}
                  onChange={(e) =>
                    updateRow(index, {
                      compliance: (e.target.value || undefined) as ComplianceStatus | undefined,
                    })
                  }
                >
                  <option value="">-</option>
                  {Object.values(ComplianceStatus).map((status) => (
                    <option key={status} value={status}>
                      {COMPLIANCE_STATUS_LABELS_PT[status]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  className="input"
                  style={{ minWidth: 100 }}
                  value={row.notes ?? ''}
                  onChange={(e) => updateRow(index, { notes: e.target.value || undefined })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  onClick={() => removeRow(index)}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} style={{ color: 'var(--color-text-muted)' }}>
                Nenhum composto adicionado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-secondary" onClick={addRow}>
          + Adicionar composto
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar resultados'}
        </button>
        {saveMutation.isSuccess && (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
            Salvo.
          </span>
        )}
      </div>
    </div>
  );
}
