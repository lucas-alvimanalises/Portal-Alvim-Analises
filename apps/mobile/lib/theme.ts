// Tokens de design do app mobile — cores, espaçamento, raios e tipografia.
// Antes desse arquivo, cada tela repetia os hexadecimais na mão em
// StyleSheet.create (ver handoff da tela inicial). Consumir daqui em telas
// novas; telas antigas continuam com cor fixa até serem revisitadas — não é
// preciso migrar tudo de uma vez. Pré-requisito pro app mobile ganhar modo
// escuro no futuro (o portal web já tem, ver apps/web/app/globals.css).
export const colors = {
  bg: '#f5f6f8',
  surface: '#ffffff',
  border: '#e2e5e9',
  text: '#1c1f24',
  textMuted: '#6b7280',
  iconInactive: '#9aa2af',
  primary: '#1f5f4d',
  primaryPressed: '#164539',
  primarySoft: '#eaf3f0',
  danger: '#b3261e',
  dangerSoft: '#fbeceb',
  surfaceMuted: '#f1f5f9',
  skeleton: '#e2e5e9',
} as const;

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
