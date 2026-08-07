import { UserDto } from '@portal-alvim/shared';
import { UserWithClientLinks } from '../domain/user.repository';

// Nunca deixar passwordHash vazar para a API — mapeamento explícito na saída.
export function toUserDto(user: UserWithClientLinks): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    jobTitle: user.jobTitle,
    role: user.role as UserDto['role'],
    active: user.active,
    emailNotifications: user.emailNotifications,
    clientIds: user.clientLinks.map((link) => link.clientId),
    hasSignature: user.signatureFileId !== null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
