import { Role } from '../enums';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  role: Role;
  active: boolean;
  // Preferência de receber notificações por e-mail (ex.: PDF de Ordem de
  // Serviço enviado ao cliente). Relevante sobretudo para role = CLIENT.
  emailNotifications: boolean;
  // Empresas que este usuário (papel CLIENT) pode acessar — N:N, só
  // relevante quando role = CLIENT.
  clientIds: string[];
  // Assinatura digital cadastrada pelo próprio usuário (ver /users/me/signature) —
  // inserida automaticamente ao aprovar uma cadeia de custódia.
  hasSignature: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  jobTitle?: string;
  role: Role;
  clientIds?: string[];
  emailNotifications?: boolean;
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, 'password'>> & {
  active?: boolean;
};

// Troca de senha feita pelo próprio usuário (tela "Meu Perfil") — exige a
// senha atual, diferente da edição de usuário pelo ADMIN (que não pede
// senha atual, ver UpdateUserPayload/UsersController).
export interface ChangeMyPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  // Todas as empresas às quais este usuário (role CLIENT) tem acesso.
  // Qual delas está "ativa" no momento é decidido por requisição (query
  // param ?clientId=, ver scope.util.ts), não fica fixo no token — assim
  // trocar de empresa no seletor não exige um novo login/refresh.
  clientIds: string[];
}
