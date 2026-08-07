// Categorização dos parâmetros pro Resumo de Resultados — pedido do
// usuário pra deixar a leitura mais fácil (agrupar por assunto em vez de
// lista corrida na ordem de cadastro). Mapeamento fica isolado aqui (não no
// CertificateAnalyteTemplate, que serve outro propósito: guiar a extração
// por IA) — mudar como o relatório agrupa não deve arriscar mexer no
// template de extração.
//
// Baseado nos nomes exatos usados em cada *_CERTIFICATE_ANALYTE_TEMPLATE de
// prisma/seed.ts. Qualquer parâmetro não listado aqui cai em "Outros
// Parâmetros" — nunca quebra, só perde o agrupamento fino.
const CATEGORY_BY_PARAMETER: Record<string, string> = {
  'Concentração Total de Siloxanos': 'Siloxanos',

  'Somatório Clorados': 'Compostos Halogenados',
  'Somatório Bromados': 'Compostos Halogenados',
  'Somatório Fluorados': 'Compostos Halogenados',

  // Nomes corrigidos (ver seed.ts) — o mesmo "VOC como Tolueno" cru
  // aparecia em dois templates diferentes (VOCs e BTEX) com valores bem
  // distintos entre si; agora distinguíveis por nome, mas ambos entram na
  // mesma categoria de leitura (são VOCs de qualquer forma).
  'Somatório VOC como Tolueno': 'VOCs',
  'COV Total como Tolueno (BTEX)': 'VOCs',
  Benzeno: 'VOCs',
  Etilbenzeno: 'VOCs',
  'o, m e p-Xileno': 'VOCs',
  Tolueno: 'VOCs',

  'Sulfeto de Hidrogênio': 'Compostos de Enxofre',
  'Iso Propil Mercaptana': 'Compostos de Enxofre',
  'Normal Propil Mercaptana': 'Compostos de Enxofre',
  'Terc Butil Mercaptana': 'Compostos de Enxofre',
  'THT Tetra Hidro Tiofeno': 'Compostos de Enxofre',
  'Enxofre Total': 'Compostos de Enxofre',

  'COG (Concentração de Odorante no Gás)': 'Odorantes',

  Mercúrio: 'Outros Parâmetros',
  Amônia: 'Outros Parâmetros',
  'Particulado Total': 'Outros Parâmetros',
  'Óleo Mineral': 'Outros Parâmetros',
  Metais: 'Metais', // linha-resumo do modo COLLAPSE_BELOW_LQ
};

// Lista de metais individuais (METAIS_CERTIFICATE_ANALYTE_TEMPLATE em
// seed.ts) — quando não colapsados em "<LQ", aparecem um a um.
const METAL_NAMES = new Set([
  'Alumínio', 'Antimônio', 'Arsênio', 'Bário', 'Bismuto', 'Boro', 'Cádmio', 'Cálcio', 'Chumbo',
  'Cobalto', 'Cobre', 'Cromo', 'Estanho', 'Estrôncio', 'Ferro', 'Lítio', 'Magnésio', 'Manganês',
  'Molibdênio', 'Níquel', 'Potássio', 'Prata', 'Selênio', 'Silício', 'Sódio', 'Tálio', 'Titânio',
  'Tungstênio', 'Vanádio', 'Zinco',
]);

const MICROBIOLOGY_KEYWORDS = ['Bactérias', 'Coliformes', 'Fungos', 'Mofo', 'Levedura'];

// Ordem fixa de exibição das categorias dentro de cada ponto — não é
// alfabética de propósito (segue o "peso" regulatório/prático: parâmetros
// centrais primeiro, "Outros" sempre por último).
export const CATEGORY_ORDER = [
  'Siloxanos',
  'Compostos Halogenados',
  'VOCs',
  'Compostos de Enxofre',
  'Odorantes',
  'Metais',
  'Microbiologia',
  'Outros Parâmetros',
];

export function categorizeParameter(parameterName: string): string {
  const direct = CATEGORY_BY_PARAMETER[parameterName];
  if (direct) return direct;
  if (METAL_NAMES.has(parameterName)) return 'Metais';
  if (MICROBIOLOGY_KEYWORDS.some((keyword) => parameterName.includes(keyword))) return 'Microbiologia';
  return 'Outros Parâmetros';
}

export function categoryOrderIndex(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}
