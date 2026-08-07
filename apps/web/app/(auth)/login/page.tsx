'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDefaultRouteForRole } from '@portal-alvim/shared';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Erro ao entrar.' }));
        throw new Error(data.message ?? 'E-mail ou senha inválidos.');
      }

      const { user } = await response.json();
      router.push(getDefaultRouteForRole(user.role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <img src="/logo.jpg" alt="Alvim Análises" style={{ width: '100%', maxWidth: 220, height: 'auto' }} />
        </div>
        <h1 style={{ marginTop: 0, fontSize: 20 }}>Portal Alvim Análises</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: -8 }}>
          Entre com suas credenciais.
        </p>

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            className="input"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 4 }}>
          <Link href="/esqueci-senha" style={{ fontSize: 13 }}>
            Esqueci minha senha
          </Link>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
