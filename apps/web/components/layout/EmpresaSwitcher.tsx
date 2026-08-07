'use client';

import { Role } from '@portal-alvim/shared';
import { useActiveClient } from '../../lib/auth/ActiveClientContext';

// Visível só para o papel CLIENT: deixa escolher qual das empresas
// vinculadas ao usuário será usada para filtrar Contratos/Agendamentos.
export function EmpresaSwitcher({ role }: { role: Role }) {
  const { companies, activeClientId, setActiveClientId, isLoading } = useActiveClient();

  if (role !== Role.CLIENT) {
    return <div />;
  }

  if (isLoading) {
    return <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Carregando empresas...</span>;
  }

  if (companies.length === 0) {
    return (
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        Seu usuário ainda não está vinculado a nenhuma empresa.
      </span>
    );
  }

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>Empresa:</span>
      <select
        className="input"
        style={{ width: 'auto', padding: '4px 8px' }}
        value={activeClientId ?? ''}
        onChange={(e) => setActiveClientId(e.target.value)}
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.companyName}
          </option>
        ))}
      </select>
    </label>
  );
}
