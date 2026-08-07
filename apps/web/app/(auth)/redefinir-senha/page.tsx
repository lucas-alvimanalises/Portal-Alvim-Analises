'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '../../../lib/api/auth.api';
import { ApiError } from '../../../lib/api/client';

// useSearchParams() exige um boundary de Suspense em build estático do
// Next.js (senão o `next build` falha em "Generating static pages" com
// "should be wrapped in a suspense boundary") — o conteúdo real fica no
// componente interno, e o default export só cuida do Suspense.
export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

// Chegada só possível pelo link do e-mail (ver ForgotPasswordUseCase) — o
// token vem na querystring, nunca digitado à mão.
function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!token) {
      setError('Link de redefinição inválido. Solicite um novo.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha.');
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
      <div className="card" style={{ width: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <img src="/logo.jpg" alt="Alvim Análises" style={{ width: '100%', maxWidth: 220, height: 'auto' }} />
        </div>
        <h1 style={{ marginTop: 0, fontSize: 20 }}>Redefinir senha</h1>

        {!token ? (
          <>
            <p className="field-error">Link de redefinição inválido ou incompleto.</p>
            <Link href="/esqueci-senha" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
              Solicitar novo link
            </Link>
          </>
        ) : success ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Senha redefinida com sucesso. Você será redirecionado para o login...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: -8 }}>
              Escolha uma nova senha para sua conta.
            </p>

            <div className="field">
              <label htmlFor="newPassword">Nova senha</label>
              <input
                id="newPassword"
                type="password"
                className="input"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirmar nova senha</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && <p className="field-error">{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
