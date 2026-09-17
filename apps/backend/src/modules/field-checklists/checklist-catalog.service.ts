import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChecklistItemDto, ChecklistSectionDto } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';

function toItemDto(item: { id: string; key: string; label: string; order: number }): ChecklistItemDto {
  return { id: item.id, key: item.key, label: item.label, order: item.order };
}

// Sem acento/maiúscula, palavras separadas por "_" — mesma convenção das
// chaves já usadas no catálogo migrado (ver scripts/seed-checklist-catalog.ts).
function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'item'
  );
}

// Catálogo do Check List de Material de Campo — Seção > Item, editável pelo
// portal (botão "+ Adicionar item" na tela de preenchimento). Substitui o
// antigo FIELD_CHECKLIST_SECTIONS fixo no código (migrado uma vez, ver
// scripts/seed-checklist-catalog.ts). `key` de cada item é o que fica salvo
// em ServiceChecklist.quantities — nunca reaproveitado, nem quando o item é
// desativado (ver removeItem).
@Injectable()
export class ChecklistCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listSections(): Promise<ChecklistSectionDto[]> {
    const sections = await this.prisma.checklistSection.findMany({
      orderBy: { order: 'asc' },
      include: { items: { where: { active: true }, orderBy: { order: 'asc' } } },
    });
    return sections.map((section) => ({
      id: section.id,
      key: section.key,
      label: section.label,
      order: section.order,
      items: section.items.map(toItemDto),
    }));
  }

  async createItem(sectionId: string, label: string): Promise<ChecklistItemDto> {
    const section = await this.prisma.checklistSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException('Seção não encontrada.');
    }
    const trimmed = label.trim();
    if (!trimmed) {
      throw new BadRequestException('Informe o nome do item.');
    }

    const key = await this.generateUniqueKey(trimmed);
    const maxOrder = await this.prisma.checklistItem.aggregate({
      where: { sectionId },
      _max: { order: true },
    });
    const item = await this.prisma.checklistItem.create({
      data: { sectionId, key, label: trimmed, order: (maxOrder._max.order ?? -1) + 1 },
    });
    return toItemDto(item);
  }

  async updateItem(itemId: string, dto: { label?: string; active?: boolean }): Promise<ChecklistItemDto> {
    const existing = await this.prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!existing) {
      throw new NotFoundException('Item não encontrado.');
    }
    const label = dto.label?.trim();
    if (dto.label !== undefined && !label) {
      throw new BadRequestException('Informe o nome do item.');
    }
    const item = await this.prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toItemDto(item);
  }

  private async generateUniqueKey(label: string): Promise<string> {
    const base = slugify(label);
    let candidate = base;
    let suffix = 2;
    // Raro colidir (nomes de item não se repetem), mas garante unicidade
    // mesmo assim em vez de deixar o banco rejeitar com erro genérico.
    while (await this.prisma.checklistItem.findUnique({ where: { key: candidate } })) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
