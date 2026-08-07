import {
  CalendarNoteDto,
  CreateCalendarNotePayload,
  UpdateCalendarNotePayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const calendarNotesApi = {
  list: () => apiClient.get<CalendarNoteDto[]>('calendar-notes'),
  create: (payload: CreateCalendarNotePayload) =>
    apiClient.post<CalendarNoteDto>('calendar-notes', payload),
  update: (id: string, payload: UpdateCalendarNotePayload) =>
    apiClient.patch<CalendarNoteDto>(`calendar-notes/${id}`, payload),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`calendar-notes/${id}`),
};
