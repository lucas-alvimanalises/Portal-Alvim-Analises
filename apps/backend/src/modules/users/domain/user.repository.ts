import { Role } from '@portal-alvim/shared';
import { User } from '@prisma/client';

// Usuário com os ids das empresas vinculadas (papel CLIENT) já carregados —
// evita N+1 nas listagens do admin — e a assinatura digital (se cadastrada).
export type UserWithClientLinks = User & {
  clientLinks: { clientId: string }[];
  signature: { filename: string; mimeType: string; storageKey: string } | null;
};

export interface UploadedSignatureData {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  jobTitle?: string;
  role: Role;
  clientIds?: string[];
  emailNotifications?: boolean;
}

export type UpdateUserData = Partial<Omit<CreateUserData, 'passwordHash'>> & {
  active?: boolean;
};

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// Porta do domínio: use-cases dependem apenas desta interface, nunca do Prisma
// diretamente — é isso que permite trocar a infraestrutura sem tocar a regra
// de negócio.
export interface UserRepository {
  findById(id: string): Promise<UserWithClientLinks | null>;
  findByEmail(email: string): Promise<UserWithClientLinks | null>;
  findMany(): Promise<UserWithClientLinks[]>;
  create(data: CreateUserData): Promise<UserWithClientLinks>;
  update(id: string, data: UpdateUserData): Promise<UserWithClientLinks>;
  deactivate(id: string): Promise<UserWithClientLinks>;
  // Usuários papel CLIENT, ativos, com acesso à empresa e marcados para
  // receber notificações por e-mail — usado para enviar o PDF de Ordem de
  // Serviço (ver SendScheduleToClientUseCase).
  findEmailRecipientsForClient(clientId: string): Promise<UserWithClientLinks[]>;
  // Equipe interna da Alvim (Administrador + Gestor), ativos e marcados para
  // receber notificações por e-mail — recebem cópia dos e-mails automáticos
  // de agendamento independente da empresa (ver SendScheduleToClientUseCase).
  findEmailRecipientsForInternalStaff(): Promise<UserWithClientLinks[]>;
  updateSignature(userId: string, file: UploadedSignatureData): Promise<UserWithClientLinks>;
  removeSignature(userId: string): Promise<UserWithClientLinks>;
  updatePassword(userId: string, passwordHash: string): Promise<UserWithClientLinks>;
}
