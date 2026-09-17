'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../../../../../../lib/api/schedules.api';
import { fieldChecklistsApi } from '../../../../../../lib/api/field-checklists.api';
import { TableSkeleton } from '../../../../../../components/shared/Skeleton';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Check list de material de campo — catálogo de seções/itens vem do banco
// (editável aqui mesmo, botão "+ Adicionar item" — ver ChecklistCatalogService),
// não é mais fixo no código. Cada item tem uma quantidade (ex.: "9
// Impingers"), não só marcado/desmarcado — 0 ou vazio significa "não levou".
// Um por agendamento; salvar de novo sobrescreve. Quem prefere papel imprime
// o modelo em branco, preenche à mão e anexa a foto/PDF na seção "Checklist
// preenchido (papel)" — os dois caminhos coexistem.
export default function ChecklistCampoPage() {
  const params = useParams<{ id: string }>();
  const scheduleId = params.id;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');

  const { data: schedule } = useQuery({
    queryKey: ['schedules', scheduleId],
    queryFn: () => schedulesApi.get(scheduleId),
  });

  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['checklist-sections'],
    queryFn: fieldChecklistsApi.listSections,
  });

  const { data: checklist, isLoading: isLoadingChecklist } = useQuery({
    queryKey: ['field-checklist', scheduleId],
    queryFn: () => fieldChecklistsApi.get(scheduleId),
  });

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && checklist !== undefined) {
      setQuantities(checklist?.quantities ?? {});
      setInitialized(true);
    }
  }, [checklist, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => fieldChecklistsApi.save(scheduleId, { quantities }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['field-checklist', scheduleId], saved);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => fieldChecklistsApi.uploadAttachment(scheduleId, file),
    onSuccess: (saved) => {
      queryClient.setQueryData(['field-checklist', scheduleId], saved);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => fieldChecklistsApi.deleteAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['field-checklist', scheduleId] }),
  });

  const createItemMutation = useMutation({
    mutationFn: (sectionId: string) => fieldChecklistsApi.createItem(sectionId, { label: newItemLabel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-sections'] });
      setAddingToSectionId(null);
      setNewItemLabel('');
    },
  });

  function setQuantity(key: string, value: string) {
    const parsed = value === '' ? 0 : Math.max(0, Math.floor(Number(value)));
    setQuantities((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  async function onFilesPicked(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync(file);
    }
  }

  function submitNewItem(sectionId: string) {
    if (!newItemLabel.trim()) return;
    createItemMutation.mutate(sectionId);
  }

  const isLoading = isLoadingSections || isLoadingChecklist;
  const totalItems = sections?.reduce((sum, section) => sum + section.items.length, 0) ?? 0;
  const filledCount = Object.values(quantities).filter((q) => q > 0).length;
  const attachments = checklist?.attachments ?? [];

  return (
    <div>
      <div className="page-header">
        <h1>Check List de Campo</h1>
        <a
          href={fieldChecklistsApi.blankUrl(scheduleId)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          Imprimir checklist em branco
        </a>
      </div>
      {schedule && (
        <p style={{ marginTop: -8 }}>
          <strong>{schedule.clientName}</strong> — {schedule.serviceTypeName}
        </p>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {filledCount}/{totalItems} itens com quantidade.
            {checklist && checklist.filledByName && (
              <>
                {' '}
                Última vez preenchido por <strong>{checklist.filledByName}</strong> em{' '}
                {new Date(checklist.updatedAt).toLocaleString('pt-BR')}.
              </>
            )}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {sections?.map((section) => (
              <div key={section.id} className="card">
                <h3 style={{ marginTop: 0, fontSize: 15 }}>{section.label}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                    >
                      <input
                        type="number"
                        min={0}
                        className="input"
                        style={{ width: 60, padding: '4px 6px', textAlign: 'center' }}
                        value={quantities[item.key] || ''}
                        placeholder="0"
                        onChange={(e) => setQuantity(item.key, e.target.value)}
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                {addingToSectionId === section.id ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input
                      autoFocus
                      className="input"
                      style={{ flex: 1, padding: '4px 6px', fontSize: 13 }}
                      placeholder="Nome do item"
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitNewItem(section.id);
                        if (e.key === 'Escape') setAddingToSectionId(null);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={createItemMutation.isPending || !newItemLabel.trim()}
                      onClick={() => submitNewItem(section.id)}
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => setAddingToSectionId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 10, padding: '4px 10px', fontSize: 12 }}
                    onClick={() => {
                      setAddingToSectionId(section.id);
                      setNewItemLabel('');
                    }}
                  >
                    + Adicionar item
                  </button>
                )}
                {createItemMutation.isError && addingToSectionId === section.id && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 6, marginBottom: 0 }}>
                    Não foi possível adicionar.
                  </p>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            {saveMutation.isSuccess && (
              <span style={{ color: 'var(--color-primary)', fontSize: 13 }}>✓ Salvo</span>
            )}
            {saveMutation.isError && (
              <span style={{ color: 'var(--color-danger)', fontSize: 13 }}>
                Não foi possível salvar.
              </span>
            )}
          </div>

          <div className="card" style={{ marginTop: 24, maxWidth: 560 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Checklist preenchido (papel)</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0 }}>
              Quem preencheu no papel: imprima o modelo em branco, marque as quantidades à mão e
              anexe aqui a foto ou PDF (pode anexar vários — frente/verso, várias páginas).
            </p>

            {attachments.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
                {attachments.map((att) => (
                  <li
                    key={att.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '6px 0',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: 13,
                    }}
                  >
                    <a
                      href={fieldChecklistsApi.attachmentFileUrl(att.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {att.filename}
                    </a>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {formatSize(att.sizeBytes)} · {att.uploadedByName}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: 12 }}
                        disabled={deleteAttachmentMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Remover "${att.filename}"?`)) {
                            deleteAttachmentMutation.mutate(att.id);
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => onFilesPicked(e.target.files)}
              disabled={uploadMutation.isPending}
              style={{ fontSize: 13 }}
            />
            {uploadMutation.isPending && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                Enviando...
              </span>
            )}
            {uploadMutation.isError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>
                Não foi possível anexar o arquivo.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
