import { User } from '@prisma/client';
import { AuthenticatedUser } from '@portal-alvim/shared';

// O enum Role gerado pelo Prisma e o Role de @portal-alvim/shared têm os
// mesmos valores em runtime, mas são tipos nominalmente distintos para o
// TypeScript — este mapeamento único evita `as unknown as Role` espalhado
// pelos use-cases. clientIds é buscado separadamente (tabela client_users)
// pelo chamador, para manter esta função pura e sem acesso a banco.
export function toAuthenticatedUser(user: User, clientIds: string[] = []): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as unknown as AuthenticatedUser['role'],
    clientIds,
  };
}
