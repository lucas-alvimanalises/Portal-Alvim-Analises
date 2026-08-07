'use client';

import { TechnicianColor } from '../../lib/agenda/technician-colors';

interface TechnicianLegendProps {
  people: { id: string; name: string }[];
  colors: Map<string, TechnicianColor>;
}

// Legenda das cores por técnico/gestor — sem isso a cor do card não diz
// quem é quem pra ninguém além de quem decorou o mapeamento.
export function TechnicianLegend({ people, colors }: TechnicianLegendProps) {
  if (people.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
        fontSize: 12,
        color: 'var(--color-text-muted)',
      }}
    >
      {people.map((person) => {
        const color = colors.get(person.id);
        return (
          <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color?.background,
                border: `1px solid ${color?.border ?? 'var(--color-border)'}`,
                display: 'inline-block',
              }}
            />
            {person.name}
          </div>
        );
      })}
    </div>
  );
}
