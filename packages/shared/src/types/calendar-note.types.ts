// Anotação livre num dia do calendário da Agenda (ex.: "Viagem ida Fortaleza
// Victor") — não é um agendamento, só um lembrete visual. technicianId é
// opcional e serve só pra colorir o texto igual à cor já usada pro
// técnico nos cards do calendário.
export interface CalendarNoteDto {
  id: string;
  date: string;
  text: string;
  technicianId: string | null;
  technician: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarNotePayload {
  date: string;
  text: string;
  technicianId?: string;
}

export interface UpdateCalendarNotePayload {
  date?: string;
  text?: string;
  technicianId?: string | null;
}
