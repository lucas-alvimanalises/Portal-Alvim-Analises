import { ForgotPasswordPayload, ResetPasswordPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

// Login/logout têm rotas Next.js dedicadas (app/api/auth/*) porque precisam
// gravar os tokens em cookies httpOnly — ver route.ts ao lado. Estas duas
// rotas são @Public() no backend e não criam sessão nenhuma, então passam
// pelo proxy genérico igual o resto da API (ver lib/api/client.ts).
export const authApi = {
  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiClient.post<{ message: string }>('auth/forgot-password', payload),
  resetPassword: (payload: ResetPasswordPayload) =>
    apiClient.post<{ message: string }>('auth/reset-password', payload),
};
