export interface ColorPalette {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  iconInactive: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  surfaceMuted: string;
  skeleton: string;
}

// Mesmos tokens/valores do modo escuro do portal web (ver
// apps/web/app/globals.css) — mesma marca, duas plataformas.
export const lightColors: ColorPalette = {
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
};

export const darkColors: ColorPalette = {
  bg: '#14161b',
  surface: '#1c1f26',
  border: '#2d323d',
  text: '#e7e9ec',
  textMuted: '#9aa2af',
  iconInactive: '#9aa2af',
  primary: '#3fae8e',
  primaryPressed: '#57c1a2',
  primarySoft: 'rgba(63, 174, 142, 0.18)',
  danger: '#f0847c',
  dangerSoft: 'rgba(240, 132, 124, 0.18)',
  surfaceMuted: '#262c36',
  skeleton: '#2a2f38',
};
