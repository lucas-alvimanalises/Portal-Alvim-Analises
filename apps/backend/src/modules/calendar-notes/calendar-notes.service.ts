import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertCalendarNoteData {
  date: string;
  text: string;
  technicianId?: string | null;
}

// Anotações livres no calendário da Agenda (ex.: "Viagem ida Fortaleza
// Victor") — não têm relação com Schedule, só marcam um dia com um texto.
@Injectable()
export class CalendarNotesService {
  constructor(private readonly prisma: PrismaService) {}

  // Sem filtro de mês na API — mesma lógica já usada pra Schedule no
  // calendário: busca tudo e filtra em memória no frontend.
  findMany() {
    return this.prisma.calendarNote.findMany({
      orderBy: { date: 'asc' },
      include: { technician: { select: { id: true, name: true } } },
    });
  }

  create(data: UpsertCalendarNoteData) {
    return this.prisma.calendarNote.create({
      data: { date: new Date(data.date), text: data.text, technicianId: data.technicianId ?? null },
      include: { technician: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: Partial<UpsertCalendarNoteData>) {
    const existing = await this.prisma.calendarNote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Anotação não encontrada.');
    }
    return this.prisma.calendarNote.update({
      where: { id },
      data: {
        ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
        ...(data.text !== undefined ? { text: data.text } : {}),
        ...(data.technicianId !== undefined ? { technicianId: data.technicianId } : {}),
      },
      include: { technician: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.calendarNote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Anotação não encontrada.');
    }
    await this.prisma.calendarNote.delete({ where: { id } });
    return { success: true };
  }
}
