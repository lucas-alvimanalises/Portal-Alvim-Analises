import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  isScheduleRealized,
  SCHEDULE_DERIVED_STATUS_COLORS,
  SCHEDULE_DERIVED_STATUS_LABELS_PT,
  ScheduleDto,
  ScheduleStatus,
} from '@portal-alvim/shared';
import { schedulesApi } from '../../../lib/api/schedules.api';

// Mesmo critério do portal web (ScheduleListView): serviços que ainda vão
// acontecer — sai da lista automaticamente assim que "realizado" (ver
// isScheduleRealized), sem baixa manual. Somente leitura aqui — editar
// agendamento continua só no portal web por enquanto.
function formatPeriodo(schedule: ScheduleDto): string {
  if (schedule.dateConfirmed) {
    const start = new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const end =
      schedule.endDate && schedule.endDate !== schedule.scheduledDate
        ? new Date(schedule.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : null;
    return end ? `${start} a ${end}` : start;
  }
  return new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
}

export default function AgendamentoScreen() {
  const { data, isLoading } = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });

  const schedules = (data ?? [])
    .filter((s) => s.status !== ScheduleStatus.CANCELLED && !isScheduleRealized(s))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Agendamento' }} />
      <FlatList
        contentContainerStyle={styles.list}
        data={schedules}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento futuro.</Text>}
        renderItem={({ item }) => {
          const colors = SCHEDULE_DERIVED_STATUS_COLORS[item.derivedStatus];
          return (
            <View style={styles.card}>
              <Text style={styles.client}>{item.clientName ?? '-'}</Text>
              <Text style={styles.meta}>{item.serviceTypeName ?? '-'}</Text>
              <Text style={styles.meta}>{formatPeriodo(item)}</Text>
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {SCHEDULE_DERIVED_STATUS_LABELS_PT[item.derivedStatus]}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    marginBottom: 12,
    gap: 4,
  },
  client: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 13 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
