import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateUserData,
  UpdateUserData,
  UploadedSignatureData,
  UserRepository,
} from '../domain/user.repository';

const INCLUDE_CLIENT_LINKS = {
  clientLinks: { select: { clientId: true as const } },
  signature: { select: { filename: true, mimeType: true, storageKey: true } },
};

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: INCLUDE_CLIENT_LINKS });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: INCLUDE_CLIENT_LINKS });
  }

  findMany() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: INCLUDE_CLIENT_LINKS,
    });
  }

  create(data: CreateUserData) {
    const { clientIds, ...userData } = data;
    return this.prisma.user.create({
      data: {
        ...userData,
        clientLinks: clientIds?.length
          ? { create: clientIds.map((clientId) => ({ clientId })) }
          : undefined,
      },
      include: INCLUDE_CLIENT_LINKS,
    });
  }

  update(id: string, data: UpdateUserData) {
    const { clientIds, ...userData } = data;

    // clientIds substitui o conjunto inteiro de vínculos (não é um "adicionar");
    // apagar e recriar dentro de uma transação evita estado parcial.
    if (clientIds !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        await tx.clientUser.deleteMany({ where: { userId: id } });
        return tx.user.update({
          where: { id },
          data: {
            ...userData,
            clientLinks: clientIds.length
              ? { create: clientIds.map((clientId) => ({ clientId })) }
              : undefined,
          },
          include: INCLUDE_CLIENT_LINKS,
        });
      });
    }

    return this.prisma.user.update({ where: { id }, data: userData, include: INCLUDE_CLIENT_LINKS });
  }

  deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      include: INCLUDE_CLIENT_LINKS,
    });
  }

  findEmailRecipientsForClient(clientId: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'CLIENT',
        active: true,
        emailNotifications: true,
        clientLinks: { some: { clientId } },
      },
      include: INCLUDE_CLIENT_LINKS,
    });
  }

  findEmailRecipientsForInternalStaff() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MANAGER'] },
        active: true,
        emailNotifications: true,
      },
      include: INCLUDE_CLIENT_LINKS,
    });
  }

  updateSignature(userId: string, file: UploadedSignatureData) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          kind: 'SIGNATURE',
          storageKey: file.storageKey,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadedById: file.uploadedById,
        },
      });
      return tx.user.update({
        where: { id: userId },
        data: { signatureFileId: attachment.id },
        include: INCLUDE_CLIENT_LINKS,
      });
    });
  }

  removeSignature(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { signatureFileId: null },
      include: INCLUDE_CLIENT_LINKS,
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      include: INCLUDE_CLIENT_LINKS,
    });
  }
}
