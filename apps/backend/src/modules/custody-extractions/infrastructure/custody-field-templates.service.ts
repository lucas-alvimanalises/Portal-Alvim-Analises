import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Lookup simples do modelo de campos cadastrado por composto (ver seed.ts
// pro modelo de Siloxanos) — sem CRUD ainda, cadastro de novos modelos
// (pros outros 13 compostos) é feito via seed por enquanto.
@Injectable()
export class CustodyFieldTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findByCompoundId(compoundId: string) {
    return this.prisma.custodyFieldTemplate.findUnique({
      where: { compoundId },
      include: { compound: { select: { code: true, name: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.custodyFieldTemplate.findUnique({ where: { id } });
  }

  // Todos os modelos cadastrados, ordenados pelo código do composto (11000,
  // 12000, ...) — usado no painel "Imprimir Cadeias de Custódia Avulso".
  findAll() {
    return this.prisma.custodyFieldTemplate.findMany({
      include: { compound: { select: { id: true, code: true, name: true } } },
      orderBy: { compound: { code: 'asc' } },
    });
  }
}
