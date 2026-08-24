import { useState } from 'react';
import { SectionList, Text, View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { AllocateScheduleModal } from '../../../../components/AllocateScheduleModal';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface DaySection {
  title: string;
  data: ScheduleDto[];
}

// Versão simplificada do Calendário do portal web (sem arrastar/soltar nem
// cores por técnico — aloca via botão + grid de dias tocável, ver
// AllocateScheduleModal) — lista os serviços do mês agrupados por dia,
// incluindo tanto os já confirmados (data exata) quanto os só com mês
// previsto.
function buildSections(schedules: ScheduleDto[], year: number, month: number): DaySection[] {
  const byDay = new Map<number, ScheduleDto[]>();

  for (const schedule of schedules) {
    if (schedule.status === ScheduleStatus.CANCELLED) continue;
    const d = new Date(schedule.scheduledDate);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month) continue;
    const day = schedule.dateConfirmed ? d.getUTCDate() : 0; // 0 = "mês inteiro, sem dia certo"
    const list = byDay.get(day) ?? [];
    list.push(schedule);
    byDay.set(day, list);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, data]) => ({
      title: day === 0 ? 'Mês previsto (sem data exata)' : `Dia ${day}`,
      data: data.sort((a, b) => (a.clientName ?? '').localeCompare(b.clientName ?? '', 'pt-BR')),
    }));
}

export default function CalendarioScreen() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [allocating, setAllocating] = useState<ScheduleDto | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });

  function changeMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }

  const sections = data ? buildSections(data, cursor.year, cursor.month) : [];

  return (
    <>
      <Stack.Screen options={{ title: 'Calendário' }} />
      <View style={styles.nav}>
        <Pressable onPress={() => changeMonth(-1)}>
          <Text style={styles.navButton}>‹ Anterior</Text>
        </Pressable>
        <Text style={styles.navLabel}>
          {MONTH_LABELS[cursor.month]} de {cursor.year}
        </Text>
        <Pressable onPress={() => changeMonth(1)}>
          <Text style={styles.navButton}>Próximo ›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.list}
          sections={sections}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum serviço neste mês.</Text>}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.client}>{item.clientName ?? '-'}</Text>
              <Text style={styles.meta}>{item.serviceTypeName ?? '-'}</Text>
              <Text style={styles.meta}>
                {item.technicians.length > 0 ? item.technicians.map((t) => t.name).join(', ') : 'Sem técnico definido'}
              </Text>
              <Pressable style={styles.allocateButton} onPress={() => setAllocating(item)}>
                <Text style={styles.allocateButtonText}>Alocar técnico e data</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      {allocating && (
        <AllocateScheduleModal
          schedule={allocating}
          initialYear={cursor.year}
          initialMonth={cursor.month}
          onClose={() => setAllocating(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e5e9',
  },
  navButton: { color: '#1f5f4d', fontWeight: '600' },
  navLabel: { fontSize: 15, fontWeight: '700' },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    marginBottom: 8,
    gap: 2,
  },
  client: { fontSize: 15, fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 13 },
  allocateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1f5f4d',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  allocateButtonText: { fontSize: 12, fontWeight: '600', color: '#1f5f4d' },
});
