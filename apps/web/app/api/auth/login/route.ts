import { NextRequest, NextResponse } from 'next/server';
import { LoginResponse } from '@portal-alvim/shared';
import { ACCESS_TOKEN_COOKIE, AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_COOKIE } from '../../../../lib/auth/cookies';

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3001/api';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const backendResponse = await fetch(`${BACKEND_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!backendResponse.ok) {
    const error = await backendResponse.json().catch(() => ({ message: 'Falha no login.' }));
    return NextResponse.json(error, { status: backendResponse.status });
  }

  const data: LoginResponse = await backendResponse.json();
  const response = NextResponse.json({ user: data.user });

  response.cookies.set(ACCESS_TOKEN_COOKIE, data.accessToken, AUTH_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_TOKEN_COOKIE, data.refreshToken, AUTH_COOKIE_OPTIONS);

  return response;
}
