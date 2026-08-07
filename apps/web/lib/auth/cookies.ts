export const ACCESS_TOKEN_COOKIE = 'portal_alvim_access_token';
export const REFRESH_TOKEN_COOKIE = 'portal_alvim_refresh_token';

// Cookies httpOnly: tokens nunca ficam acessíveis via JS no browser (mitigação XSS).
// São setados/lidos só em Route Handlers e Server Components, nunca em Client Components.
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
