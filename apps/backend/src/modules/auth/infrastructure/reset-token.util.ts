import { createHash } from 'crypto';

// 1 hora — bem mais curto que o refresh token (7d, ver TokenService), já que
// este token só serve pra uma única ação sensível (trocar a senha), não pra
// manter sessão.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Mesmo raciocínio do TokenService.hashRefreshToken: o token bruto enviado
// por e-mail já é uma string de alta entropia (32 bytes aleatórios), então
// SHA-256 é suficiente pra comparação — evita guardar o valor usável em
// texto puro no banco (quem tiver acesso de leitura ao banco não consegue
// "roubar" um token válido de lá).
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
