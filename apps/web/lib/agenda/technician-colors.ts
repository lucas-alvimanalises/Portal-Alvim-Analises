// Cor de fundo do card no calendário por técnico responsável — ajuda a
// visualizar rapidamente quem está alocado em cada dia sem precisar ler o
// nome. Fundos sempre claros (mesmo tom em claro/escuro, não seguem o
// tema) — por isso `text` vem pareado e fixo aqui, nunca `var(--color-text)`:
// no modo escuro essa variável vira quase-branco e ficava ilegível em cima
// desses pastéis claros (bug real, achado pelo usuário — ver ScheduleCard).
export interface TechnicianColor {
  background: string;
  border: string;
  text: string;
}

const PALETTE: TechnicianColor[] = [
  { background: '#dbeafe', border: '#93c5fd', text: '#1e40af' }, // azul claro
  { background: '#dcfce7', border: '#86efac', text: '#166534' }, // verde claro
  { background: '#fef9c3', border: '#fde047', text: '#854d0e' }, // amarelo claro
  { background: '#fce7f3', border: '#f9a8d4', text: '#9d174d' }, // rosa claro
  { background: '#ede9fe', border: '#c4b5fd', text: '#5b21b6' }, // roxo claro
  { background: '#ffedd5', border: '#fdba74', text: '#9a3412' }, // laranja claro
  { background: '#cffafe', border: '#67e8f9', text: '#155e75' }, // ciano claro
  { background: '#e5e7eb', border: '#d1d5db', text: '#374151' }, // cinza claro
];

// Sem técnico atribuído: cai no fundo neutro do card (`--color-surface`),
// esse sim acompanha o tema — por isso o texto aqui pode continuar
// `var(--color-text)` normalmente, sem risco de ilegibilidade.
export const DEFAULT_TECHNICIAN_COLOR: TechnicianColor = {
  background: 'var(--color-surface)',
  border: 'var(--color-border)',
  text: 'var(--color-text)',
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
