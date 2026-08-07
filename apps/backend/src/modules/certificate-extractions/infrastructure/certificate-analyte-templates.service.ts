import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Lookup simples do modelo de análises a extrair, cadastrado por composto
// (ver seed.ts pro modelo de VOCs) — mesmo padrão de
// CustodyFieldTemplatesService: sem CRUD ainda, cadastro de novos modelos é
// feito via seed por enquanto.
@Injectable()
export class CertificateAnalyteTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findByCompoundId(compoundId: string) {
    return this.prisma.certificateAnalyteTemplate.findUnique({
      where: { compoundId },
      include: { compound: { select: { code: true, name: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.certificateAnalyteTemplate.findUnique({ where: { id } });
  }
}
