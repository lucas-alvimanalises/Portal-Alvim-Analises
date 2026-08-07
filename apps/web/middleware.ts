import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { canAccessRoute, getDefaultRouteForRole, Role } from '@portal-alvim/shared';
import { ACCESS_TOKEN_COOKIE } from './lib/auth/cookies';

interface AccessTokenClaims {
  role: Role;
  exp: number;
}

// Rotas acessíveis sem sessão — login em si e o fluxo de "esqueci minha
// senha" (pedido de link + tela que o link abre), que por definição só faz
// sentido pra quem ainda não está autenticado.
const PUBLIC_PATHS = ['/login', '/esqueci-senha', '/redefinir-senha'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  let claims: AccessTokenClaims | null = null;
  if (token) {
    try {
      const decoded = jwtDecode<AccessTokenClaims>(token);
      if (decoded.exp * 1000 > Date.now()) {
        claims = decoded;
      }
    } catch {
      claims = null;
    }
  }

  if (!claims) {
    if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return NextResponse.next();
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessRoute(claims.role, pathname)) {
    return NextResponse.redirect(new URL(getDefaultRouteForRole(claims.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclui também qualquer caminho com extensão de arquivo (ex.: /logo.jpg)
  // — sem isso, um arquivo estático em /public pedido sem sessão (ex.: o
  // logo na própria tela de login) caía na regra de redirecionamento pra
  // /login como se fosse uma página protegida, e nunca chegava a carregar.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
