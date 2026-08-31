import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { isFieldEligibleStaff, ScheduleDto, UserDto } from '@portal-alvim/shared';
import { schedulesApi } from '../lib/api/schedules.api';
import { usersApi } from '../lib/api/users.api';
import { getApiErrorMessage } from '../lib/api/client';
import { radii, spacing } from '../lib/theme';
import { ColorPalette } from '../lib/theme/palettes';
import { useThemeColors } from '../lib/theme/ThemeContext';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

interface AllocateScheduleModalProps {
  schedule: ScheduleDto;
  // Mês inicial do grid — o mês atualmente visto no Calendário (o serviço
  // pode ser movido pra outro mês navegando dentro da própria modal).
  initialYear: number;
  initialMonth: number;
  onClose: () => void;
}

// Alocar técnico(s) + data exata a um serviço direto pelo app — mesmo
// resultado do drag-and-drop do Calendário do portal web (PATCH /schedules/
// :id com scheduledDate + dateConfirmed + technicianIds), só que via grid de
// dias tocável em vez de arrastar (sem depender de um date picker nativo).
export function AllocateScheduleModal({
  schedule,
  initialYear,
  initialMonth,
  onClose,
}: AllocateScheduleModalProps) {
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const scheduledDate = new Date(schedule.scheduledDate);
  const [cursor, setCursor] = useState(() => {
    if (schedule.dateConfirmed) {
      return { year: scheduledDate.getUTCFullYear(), month: scheduledDate.getUTCMonth() };
    }
    return { year: initialYear, month: initialMonth };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(
    schedule.dateConfirmed ? scheduledDate.getUTCDate() : null,
  );
  const [technicianIds, setTechnicianIds] = useState<string[]>(
    schedule.technicians.map((t) => t.id),
  );

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  // Gestor e Admin também podem ser designados responsáveis de campo, além
  // de Técnico — mesmo critério do seletor equivalente no portal web
  // (isFieldEligibleStaff já cobre `active`, sem precisar checar de novo aqui).
  const technicianOptions = (users ?? []).filter(isFieldEligibleStaff);

  const mutation = useMutation({
    mutationFn: () => {
      const dayKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(
        selectedDay,
      ).padStart(2, '0')}`;
      return schedulesApi.update(schedule.id, {
        scheduledDate: dayKey,
        dateConfirmed: true,
        technicianIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      onClose();
    },
  });

  function toggleTechnician(id: string) {
    setTechnicianIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  function changeMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
    setSelectedDay(null);
  }

  const total = daysInMonth(cursor.year, cursor.month);
  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay();
  const dayCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  const canConfirm = selectedDay !== null && technicianIds.length > 0 && !mutation.isPending;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ padding: spacing[4] }}>
            <Text style={styles.title}>Alocar Serviço</Text>
            <Text style={styles.subtitle}>
              {schedule.clientName} — {schedule.serviceTypeName}
            </Text>

            <Text style={styles.label}>Data</Text>
            <View style={styles.monthNav}>
              <Pressable onPress={() => changeMonth(-1)}>
                <Text style={styles.monthNavButton}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>
                {MONTH_LABELS[cursor.month]} de {cursor.year}
              </Text>
              <Pressable onPress={() => changeMonth(1)}>
                <Text style={styles.monthNavButton}>›</Text>
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map((w, i) => (
                <Text key={i} style={styles.weekdayLabel}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {dayCells.map((day, index) => (
                <Pressable
                  key={index}
                  disabled={day === null}
                  onPress={() => day !== null && setSelectedDay(day)}
                  style={[
                    styles.dayCell,
                    day !== null && selectedDay === day && styles.dayCellSelected,
                  ]}
                >
                  {day !== null && (
                    <Text style={[styles.dayCellText, selectedDay === day && styles.dayCellTextSelected]}>
                      {day}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Técnicos responsáveis</Text>
            <View style={styles.techList}>
              {technicianOptions.length === 0 ? (
                <Text style={styles.empty}>Nenhum técnico cadastrado.</Text>
              ) : (
                technicianOptions.map((tech: UserDto, index: number) => {
                  const selected = technicianIds.includes(tech.id);
                  return (
                    <Pressable
                      key={tech.id}
                      onPress={() => toggleTechnician(tech.id)}
                      style={[styles.techRow, index > 0 && styles.techRowBorder]}
                    >
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected && <Check size={13} strokeWidth={3} color="#fff" />}
                      </View>
                      <Text style={styles.techName}>{tech.name}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
            {technicianIds.length === 0 && (
              <Text style={styles.warning}>Selecione ao menos um técnico.</Text>
            )}

            {mutation.isError && (
              <Text style={styles.error}>
                {getApiErrorMessage(mutation.error, 'Não foi possível salvar a alocação.')}
              </Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
              disabled={!canConfirm}
              onPress={() => mutation.mutate()}
            >
              <Text style={styles.confirmButtonText}>
                {mutation.isPending ? 'Salvando...' : 'Confirmar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    maxHeight: '85%',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: spacing[4] },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2] },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  monthNavButton: { fontSize: 22, color: colors.primary, fontWeight: '700', paddingHorizontal: spacing[3] },
  monthLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  weekRow: { flexDirection: 'row' },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing[4] },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  dayCellSelected: { backgroundColor: colors.primary },
  dayCellText: { fontSize: 13, color: colors.text },
  dayCellTextSelected: { color: '#fff', fontWeight: '700' },
  techList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  empty: { padding: spacing[3], color: colors.textMuted, fontSize: 13 },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: 10,
    paddingHorizontal: spacing[3],
  },
  techRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  techName: { fontSize: 14, color: colors.text },
  warning: { fontSize: 12, color: colors.danger, marginTop: spacing[2] },
  error: { fontSize: 13, color: colors.danger, marginTop: spacing[3] },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  });
}
