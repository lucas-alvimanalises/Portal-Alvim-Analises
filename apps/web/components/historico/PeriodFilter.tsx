'use client';

import { DateInput } from '../shared/DateInput';

interface PeriodFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

// Filtro de período único e compartilhado — aumenta ou diminui quantas
// amostras entram nas tabelas de tendência/gráficos/listas abaixo dele, seja
// de um só ponto (rota de nível 3) ou de vários pontos/empresas ao mesmo
// tempo (modo de comparação): um filtro só vale pra tudo que está na tela,
// em vez de um campo repetido por amostra/ponto (confirmado com o usuário).
export function PeriodFilter({ startDate, endDate, onStartDateChange, onEndDateChange }: PeriodFilterProps) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      <div className="field">
        <label>De</label>
        <DateInput value={startDate} onChange={onStartDateChange} />
      </div>
      <div className="field">
        <label>Até</label>
        <DateInput value={endDate} onChange={onEndDateChange} />
      </div>
      {(startDate || endDate) && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            onStartDateChange('');
            onEndDateChange('');
          }}
        >
          Limpar período
        </button>
      )}
    </div>
  );
}
