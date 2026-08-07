'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarNoteDto } from '@portal-alvim/shared';
import { calendarNotesApi } from '../../lib/api/calendar-notes.api';
import { TechnicianColor } from '../../lib/agenda/technician-colors';

interface DayNoteModalProps {
  // Dia 'AAAA-MM-DD' pra criar uma nota nova; ignorado quando `note` já existe
  // (edição usa a data que a nota já tem).
  dayKey: string;
  note: CalendarNoteDto | null;
  people: { id: string; name: string }[];
  colors: Map<string, TechnicianColor>;
  onClose: () => void;
}

// Anotação livre num dia do calendário (ex.: "Viagem ida Fortaleza Victor")
// — não é um agendamento, só um lembrete visual escrito na cor do técnico
// selecionado (ver technician-colors.ts), fundo sempre branco/neutro.
export function DayNoteModal({ dayKey, note, people, colors, onClose }: DayNoteModalProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(note?.text ?? '');
  const [technicianId, setTechnicianId] = useState(note?.technicianId ?? '');

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ['calendar-notes'] });
    onClose();
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      note
        ? calendarNotesApi.update(note.id, { text, technicianId: technicianId || null })
        : calendarNotesApi.create({ date: dayKey, text, technicianId: technicianId || undefined }),
    onSuccess: invalidateAndClose,
  });

  const deleteMutation = useMutation({
    mutationFn: () => calendarNotesApi.remove(note!.id),
    onSuccess: invalidateAndClose,
  });

  const previewColor = technicianId ? colors.get(technicianId)?.border : undefined;
  const targetLabel = new Date(`${dayKey}T00:00:00Z`).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div className="card" style={{ width: 420, maxWidth: '90vw' }}>
        <h3 style={{ marginTop: 0 }}>{note ? 'Editar anotação' : 'Nova anotação'}</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: -8 }}>{targetLabel}</p>

        <div className="field">
          <label>Texto</label>
          <textarea
            className="input"
            rows={2}
            maxLength={280}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: Viagem ida Fortaleza Victor"
            style={{ color: previewColor }}
          />
        </div>

        <div className="field">
          <label>Cor (técnico/gestor)</label>
          <select
            className="input"
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
          >
            <option value="">Sem cor</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <div>
            {note && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: 'var(--color-danger)' }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!text.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
