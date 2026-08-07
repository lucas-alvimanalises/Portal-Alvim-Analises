import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { ACCESS_TOKEN_COOKIE } from './cookies';

interface AccessTokenClaims {
  sub: string;
  name: string;
  email: string;
  role: AuthenticatedUser['role'];
  clientIds: string[];
  exp: number;
}

// Decodifica (não verifica assinatura) o access token só para renderizar a UI
// (nome, papel, navegação). A autoridade real de autorização são os Guards
// do NestJS em cada chamada de API — isto aqui é apenas conveniência de UI.
export function getSession(): AuthenticatedUser | null {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const claims = jwtDecode<AccessTokenClaims>(token);
    if (claims.exp * 1000 < Date.now()) return null;

    return {
      id: claims.sub,
      name: claims.name,
      email: claims.email,
      role: claims.role,
      clientIds: claims.clientIds ?? [],
    };
  } catch {
    return null;
  }
}
