// Tokens de design do app mobile — espaçamento, raios e tipografia (cores
// ficam em lib/theme/ThemeContext.tsx via useThemeColors(), já que elas
// mudam com o modo claro/escuro — o resto aqui é igual nos dois temas).
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  pill: 999,
} as const;

export const shadow = {
  shadowColor: '#101828',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
} as const;

export const typography = {
  screenTitle: { fontSize: 22, fontWeight: '700' as const },
  cardTitle: { fontSize: 16, fontWeight: '700' as const },
  rowTitle: { fontSize: 14, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  sectionLabel: { fontSize: 13, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
  badge: { fontSize: 12, fontWeight: '600' as const },
  tabLabel: { fontSize: 11 },
} as const;
