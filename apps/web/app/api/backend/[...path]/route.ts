import { NextRequest, NextResponse } from 'next/server';
import { AuthTokens } from '@portal-alvim/shared';
import { ACCESS_TOKEN_COOKIE, AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_COOKIE } from '../../../../lib/auth/cookies';

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3001/api';

/**
 * Proxy genérico (padrão BFF): todo chamada de API feita por Client Components
 * passa por aqui em vez de ir direto ao NestJS. Isso mantém os tokens em
 * cookies httpOnly (inacessíveis a JS no browser) e centraliza a lógica de
 * refresh automático em 401 num único lugar, em vez de duplicá-la por recurso.
 */
async function proxy(request: NextRequest, path: string[]) {
  const targetUrl = `${BACKEND_API_URL}/${path.join('/')}${request.nextUrl.search}`;
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  // ArrayBuffer (não .text()) preserva corpo binário — necessário pra upload
  // multipart de certificados passar intacto pelo proxy.
  const body = hasBody ? await request.arrayBuffer() : undefined;
  // Repassa o Content-Type original da requisição (inclui o boundary do
  // multipart) em vez de forçar JSON — apiClient já manda application/json
  // nas chamadas normais, então isso não muda nada pra elas.
  const contentType = request.headers.get('content-type') ?? undefined;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  let backendResponse = await forward(targetUrl, request.method, body, contentType, accessToken);

  if (backendResponse.status === 401) {
    const refreshed = await tryRefresh(request);
    if (refreshed) {
      backendResponse = await forward(targetUrl, request.method, body, contentType, refreshed.accessToken);
      const nextResponse = await toNextResponse(backendResponse);
      nextResponse.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, AUTH_COOKIE_OPTIONS);
      nextResponse.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, AUTH_COOKIE_OPTIONS);
      return nextResponse;
    }
  }

  return toNextResponse(backendResponse);
}

function forward(
  url: string,
  method: string,
  body: ArrayBuffer | undefined,
  contentType: string | undefined,
  token?: string,
) {
  return fetch(url, {
    method,
    headers: {
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    cache: 'no-store',
  });
}

async function tryRefresh(request: NextRequest): Promise<AuthTokens | null> {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const response = await fetch(`${BACKEND_API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) return null;
  return response.json();
}

async function toNextResponse(backendResponse: Response) {
  if (backendResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const contentType = backendResponse.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') || contentType === '') {
    const text = await backendResponse.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: backendResponse.status });
  }

  // Passthrough binário (ex.: download de certificado em PDF/imagem) — não
  // tenta fazer JSON.parse de bytes crus.
  const buffer = await backendResponse.arrayBuffer();
  const headers = new Headers({ 'Content-Type': contentType });
  const disposition = backendResponse.headers.get('content-disposition');
  if (disposition) headers.set('Content-Disposition', disposition);
  return new NextResponse(buffer, { status: backendResponse.status, headers });
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
