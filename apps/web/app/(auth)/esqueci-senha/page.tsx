'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../../lib/api/auth.api';
import { ApiError } from '../../../lib/api/client';

// Sempre mostra a mesma mensagem de sucesso, exista ou não o e-mail
// cadastrado — o backend (ForgotPasswordUseCase) segue a mesma regra, então
// aqui não há como (nem por que) tentar diferenciar os dois casos.
export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível processar o pedido.');
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
        <h1 style={{ marginTop: 0, fontSize: 20 }}>Esqueci minha senha</h1>

        {sent ? (
          <>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
              Se este e-mail estiver cadastrado no portal, você receberá um link de redefinição em
              instantes. O link expira em 1 hora.
            </p>
            <Link href="/login" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
              Voltar para o login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: -8 }}>
              Informe o e-mail cadastrado para receber um link de redefinição de senha.
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

            {error && <p className="field-error">{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Link href="/login" style={{ fontSize: 13 }}>
                Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
