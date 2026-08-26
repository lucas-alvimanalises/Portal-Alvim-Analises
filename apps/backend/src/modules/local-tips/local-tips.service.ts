import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, LocalTipDto, Role } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLocalTipDto } from './dto/create-local-tip.dto';
import { UpdateLocalTipDto } from './dto/update-local-tip.dto';
import { toLocalTipDto } from './local-tip.mapper';

const INCLUDE = {
  client: { select: { companyName: true } },
  createdBy: { select: { name: true } },
};

// Mural colaborativo de dicas locais (onde comer, onde comprar insumo que
// só acha na cidade do cliente, etc.) — uso 100% interno da Alvim. Sem
// nenhum conceito de escopo por empresa do papel CLIENT aqui (diferente de
// PlantMaintenancesService/assertOwnership): o controller já bloqueia
// CLIENT inteiramente, então qualquer ADMIN/MANAGER/TECHNICIAN autenticado
// enxerga as dicas de qualquer cliente.
@Injectable()
export class LocalTipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByClient(clientId: string): Promise<LocalTipDto[]> {
    const rows = await this.prisma.clientLocalTip.findMany({
      where: { clientId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toLocalTipDto);
  }

  // Contagem por empresa pra listagem de nível 1 (/dicas-locais) — uma
  // query só, não N+1 por empresa.
  async countByClient(): Promise<Record<string, number>> {
    const groups = await this.prisma.clientLocalTip.groupBy({
      by: ['clientId'],
      _count: { _all: true },
    });
    return Object.fromEntries(groups.map((g) => [g.clientId, g._count._all]));
  }

  async create(dto: CreateLocalTipDto, user: AuthenticatedUser): Promise<LocalTipDto> {
    const row = await this.prisma.clientLocalTip.create({
      data: {
        clientId: dto.clientId,
        name: dto.name,
        category: dto.category,
        address: dto.address,
        mapsUrl: dto.mapsUrl,
        notes: dto.notes,
        createdById: user.id,
      },
      include: INCLUDE,
    });
    return toLocalTipDto(row);
  }

  // Só quem criou a dica pode editar/excluir — ADMIN/MANAGER sempre podem,
  // pra moderar (pedido do usuário: evita apagar/alterar sem querer a dica
  // de um colega). TECHNICIAN só mexe nas próprias.
  private assertCanModify(user: AuthenticatedUser, createdById: string): void {
    if (user.role === Role.ADMIN || user.role === Role.MANAGER) return;
    if (createdById !== user.id) {
      throw new ForbiddenException('Só quem cadastrou a dica pode editá-la ou excluí-la.');
    }
  }

  async update(id: string, dto: UpdateLocalTipDto, user: AuthenticatedUser): Promise<LocalTipDto> {
    const existing = await this.prisma.clientLocalTip.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Dica não encontrada.');
    }
    this.assertCanModify(user, existing.createdById);

    const row = await this.prisma.clientLocalTip.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.mapsUrl !== undefined ? { mapsUrl: dto.mapsUrl } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: INCLUDE,
    });
    return toLocalTipDto(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ success: true }> {
    const existing = await this.prisma.clientLocalTip.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Dica não encontrada.');
    }
    this.assertCanModify(user, existing.createdById);

    await this.prisma.clientLocalTip.delete({ where: { id } });
    return { success: true };
  }
}
