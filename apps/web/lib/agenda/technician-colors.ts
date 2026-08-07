// Cor de fundo do card no calendário por técnico responsável — ajuda a
// visualizar rapidamente quem está alocado em cada dia sem precisar ler o
// nome. Só cores claras (texto escuro continua legível em cima).
export interface TechnicianColor {
  background: string;
  border: string;
}

const PALETTE: TechnicianColor[] = [
  { background: '#dbeafe', border: '#93c5fd' }, // azul claro
  { background: '#dcfce7', border: '#86efac' }, // verde claro
  { background: '#fef9c3', border: '#fde047' }, // amarelo claro
  { background: '#fce7f3', border: '#f9a8d4' }, // rosa claro
  { background: '#ede9fe', border: '#c4b5fd' }, // roxo claro
  { background: '#ffedd5', border: '#fdba74' }, // laranja claro
  { background: '#cffafe', border: '#67e8f9' }, // ciano claro
  { background: '#e5e7eb', border: '#d1d5db' }, // cinza claro
];

export const DEFAULT_TECHNICIAN_COLOR: TechnicianColor = {
  background: 'var(--color-surface)',
  border: 'var(--color-border)',
};

// Nomes citados explicitamente pelo usuário (Victor = azul, Marcio = verde,
// Gilson = amarelo) — garante essas cores independente da ordem em que a
// API devolve os usuários.
const NAME_OVERRIDES: Record<string, number> = {
  victor: 0,
  marcio: 1,
  gilson: 2,
};

function firstNameKey(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') ?? ''
  );
}

// Mapa estável id -> cor. Os nomes conhecidos pegam a cor combinada com o
// usuário; os demais técnicos/gestores pegam a próxima cor livre da
// paleta, na ordem em que aparecem na lista recebida (mesma ordem já usada
// nos seletores de técnico) — assim cada colaborador sempre cai na mesma
// cor entre navegações.
export function buildTechnicianColorMap(
  people: { id: string; name: string }[],
): Map<string, TechnicianColor> {
  const map = new Map<string, TechnicianColor>();
  const usedIndexes = new Set<number>();

  people.forEach((person) => {
    const idx = NAME_OVERRIDES[firstNameKey(person.name)];
    if (idx !== undefined) {
      map.set(person.id, PALETTE[idx % PALETTE.length]);
      usedIndexes.add(idx);
    }
  });

  let nextIndex = 0;
  people.forEach((person) => {
    if (map.has(person.id)) return;
    while (usedIndexes.has(nextIndex)) nextIndex++;
    map.set(person.id, PALETTE[nextIndex % PALETTE.length]);
    usedIndexes.add(nextIndex);
    nextIndex++;
  });

  return map;
}
