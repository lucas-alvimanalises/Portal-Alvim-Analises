import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, TrackingShipmentStatus } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';

const INCLUDE_CREATED_BY = { createdBy: { select: { id: true, name: true } } } as const;

// Log de envios de amostras pelos Correios pro laboratório parceiro — não
// tem relação com Schedule (um mesmo envio pode carregar amostras de mais
// de um serviço), por isso sem assertOwnership/escopo por cliente: é uma
// ferramenta operacional interna Alvim, igual Cadeia de Custódia.
@Injectable()
export class TrackingShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.trackingShipment.findMany({
      orderBy: { postedAt: 'desc' },
      include: INCLUDE_CREATED_BY,
    });
  }

  create(data: { trackingCode: string; description: string }, user: AuthenticatedUser) {
    return this.prisma.trackingShipment.create({
      data: {
        trackingCode: data.trackingCode.trim(),
        description: data.description.trim(),
        createdById: user.id,
      },
      include: INCLUDE_CREATED_BY,
    });
  }

  // Único status editável depois de criado: IN_TRANSIT -> DELIVERED, uma via
  // só (confirmar entrega). Não existe caminho de volta pra IN_TRANSIT —
  // erro de clique se corrige excluindo e recriando (ver remove abaixo).
  async markDelivered(id: string) {
    const existing = await this.prisma.trackingShipment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Envio não encontrado.');
    }
    if (existing.status === TrackingShipmentStatus.DELIVERED) {
      throw new ConflictException('Este envio já está marcado como entregue.');
    }
    return this.prisma.trackingShipment.update({
      where: { id },
      data: { status: TrackingShipmentStatus.DELIVERED, deliveredAt: new Date() },
      include: INCLUDE_CREATED_BY,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.trackingShipment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Envio não encontrado.');
    }
    await this.prisma.trackingShipment.delete({ where: { id } });
    return { success: true };
  }
}
