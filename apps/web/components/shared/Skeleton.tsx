// Skeleton loading — substitui o texto simples "Carregando..." usado antes
// em praticamente toda tela do portal (ver especificação de modernização
// visual, "estados de carregamento"). Blocos cinza-claro com pulso sutil
// (ver .skeleton em globals.css), no formato aproximado do conteúdo que vai
// carregar — não precisa ser pixel-perfeito por tela, só transmitir "isso
// aqui é uma linha de tabela"/"isso aqui é um card" em vez de texto plano.
export function Skeleton({
  width,
  height,
  style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: width ?? '100%', height: height ?? 14, ...style }} />;
}

// Formato aproximado de uma tabela — usada como substituto padrão de
// "Carregando..." na maioria das telas do portal (listagens). `columns`
// controla só a largura relativa de cada "célula" fake, não o número real
// de colunas da tabela de verdade.
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 2px' }} aria-busy="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: 20 }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              height={14}
              style={colIndex === 0 ? { flex: '0 0 110px' } : { flex: 1, maxWidth: 220 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Formato aproximado de uma fileira de cards (ex.: StatCard do Dashboard).
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ flex: 1, minWidth: 160 }}>
          <Skeleton height={12} width="55%" style={{ marginBottom: 12 }} />
          <Skeleton height={26} width="35%" />
        </div>
      ))}
    </div>
  );
}
