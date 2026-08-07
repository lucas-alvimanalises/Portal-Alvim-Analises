'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role, ROLE_LABELS_PT } from '@portal-alvim/shared';
import { usersApi } from '../../../lib/api/users.api';
import { ApiError } from '../../../lib/api/client';
import { SignaturePad, SignaturePadHandle } from '../../../components/profile/SignaturePad';
import { TableSkeleton } from '../../../components/shared/Skeleton';

const SIGNATURE_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN];
type SignatureInputMode = 'file' | 'draw';

// Assinatura digital cadastrada pelo próprio usuário — inserida
// automaticamente no campo "Assinatura amostrador" ao aprovar uma cadeia de
// custódia (ver ApproveCustodyExtractionUseCase). Só faz sentido pra equipe
// Alvim (ADMIN/MANAGER/TECHNICIAN); CLIENT não participa desse fluxo.
export default function MeuPerfilPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [mode, setMode] = useState<SignatureInputMode>('file');
  const [padHasContent, setPadHasContent] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersApi.me(),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
  }

  const uploadMutation = useMutation({
    mutationFn: (selected: File) => usersApi.uploadMySignature(selected),
    onSuccess: () => {
      setFile(null);
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => usersApi.removeMySignature(),
    onSuccess: () => {
      setPendingRemove(false);
      invalidate();
    },
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const passwordMismatch = newPassword.length > 0 && newPassword !== confirmPassword;

  const changePasswordMutation = useMutation({
    mutationFn: () => usersApi.changeMyPassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    },
  });

  if (isLoading || !me) {
    return <TableSkeleton />;
  }

  const canHaveSignature = SIGNATURE_ROLES.includes(me.role);

  return (
    <div>
      <div className="page-header">
        <h1>Meu Perfil</h1>
      </div>

      <div className="card" style={{ marginBottom: 20, maxWidth: 480 }}>
        <div className="field">
          <label>Nome</label>
          <p style={{ margin: 0 }}>{me.name}</p>
        </div>
        <div className="field">
          <label>E-mail</label>
          <p style={{ margin: 0 }}>{me.email}</p>
        </div>
        <div className="field">
          <label>Papel</label>
          <p style={{ margin: 0 }}>{ROLE_LABELS_PT[me.role]}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, maxWidth: 480 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Alterar senha</h3>

        <div className="field">
          <label>Senha atual</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setPasswordSuccess(false);
            }}
          />
        </div>
        <div className="field">
          <label>Nova senha</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordSuccess(false);
            }}
          />
        </div>
        <div className="field">
          <label>Confirmar nova senha</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordSuccess(false);
            }}
          />
          {passwordMismatch && (
            <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>
              As senhas não coincidem.
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={
            !currentPassword ||
            !newPassword ||
            newPassword.length < 6 ||
            passwordMismatch ||
            changePasswordMutation.isPending
          }
          onClick={() => changePasswordMutation.mutate()}
        >
          {changePasswordMutation.isPending ? 'Salvando...' : 'Alterar senha'}
        </button>

        {passwordSuccess && (
          <p style={{ fontSize: 13, color: 'var(--color-success, #0ca30c)', marginBottom: 0 }}>
            Senha alterada com sucesso.
          </p>
        )}
        {changePasswordMutation.isError && (
          <p style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 0 }}>
            {changePasswordMutation.error instanceof ApiError
              ? changePasswordMutation.error.message
              : 'Não foi possível alterar a senha.'}
          </p>
        )}
      </div>

      {canHaveSignature && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Assinatura digital</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0 }}>
            Usada para preencher automaticamente o campo &quot;Assinatura amostrador&quot; ao
            gerar uma cadeia de custódia.
          </p>

          {me.hasSignature && (
            <div style={{ marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={usersApi.mySignatureFileUrl()}
                alt="Assinatura cadastrada"
                style={{
                  maxWidth: 280,
                  maxHeight: 120,
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  display: 'block',
                  background: '#fff',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              className={mode === 'file' ? 'btn btn-secondary' : 'btn'}
              style={mode === 'file' ? undefined : { background: 'transparent' }}
              onClick={() => setMode('file')}
            >
              Enviar arquivo
            </button>
            <button
              type="button"
              className={mode === 'draw' ? 'btn btn-secondary' : 'btn'}
              style={mode === 'draw' ? undefined : { background: 'transparent' }}
              onClick={() => setMode('draw')}
            >
              Desenhar assinatura
            </button>
          </div>

          {mode === 'file' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div style={{ marginBottom: 10 }}>
              <SignaturePad ref={padRef} onContentChange={setPadHasContent} />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 8 }}
                onClick={() => padRef.current?.clear()}
                disabled={!padHasContent}
              >
                Limpar
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                uploadMutation.isPending || (mode === 'file' ? !file : !padHasContent)
              }
              onClick={async () => {
                if (mode === 'file') {
                  if (file) uploadMutation.mutate(file);
                  return;
                }
                const blob = await padRef.current?.toBlob();
                if (blob) {
                  uploadMutation.mutate(new File([blob], 'assinatura.png', { type: 'image/png' }));
                  padRef.current?.clear();
                }
              }}
            >
              {uploadMutation.isPending
                ? 'Enviando...'
                : me.hasSignature
                  ? 'Substituir assinatura'
                  : 'Salvar assinatura'}
            </button>
            {me.hasSignature &&
              (pendingRemove ? (
                <>
                  <span style={{ fontSize: 13 }}>Remover assinatura?</span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeMutation.mutate()}
                    disabled={removeMutation.isPending}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPendingRemove(false)}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setPendingRemove(true)}
                >
                  Remover
                </button>
              ))}
          </div>

          {uploadMutation.isError && (
            <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>
              {uploadMutation.error instanceof ApiError
                ? uploadMutation.error.message
                : 'Não foi possível enviar a assinatura.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
