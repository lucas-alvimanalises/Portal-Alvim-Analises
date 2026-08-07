import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SCHEDULE_STATUS_LABELS_PT, ScheduleStatus } from '@portal-alvim/shared';
import { schedulesApi } from '../../lib/api/schedules.api';

// Somente leitura nesta fase: o técnico visualiza seus agendamentos.
// O backend já filtra a lista pelo próprio técnico (RBAC), então aqui é
// só renderizar o retorno de GET /schedules.
export default function MeusAgendamentosScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-schedules'],
    queryFn: schedulesApi.list,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento encontrado.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.date}>
            {new Date(item.scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            {item.endDate &&
              item.endDate !== item.scheduledDate &&
              ` a ${new Date(item.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
          </Text>
          <Text style={styles.status}>
            {SCHEDULE_STATUS_LABELS_PT[item.status as ScheduleStatus]}
          </Text>
        </View>
      )}
    />
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
  },
  date: { fontSize: 16, fontWeight: '600' },
  status: { marginTop: 4, color: '#1f5f4d', fontWeight: '600' },
});
