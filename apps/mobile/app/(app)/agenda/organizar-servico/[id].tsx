import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '../../../../lib/api/schedules.api';

function formatPeriodo(scheduledDate: string, endDate: string | null, dateConfirmed: boolean): string {
  if (!dateConfirmed) {
    return new Date(scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  }
  const start = new Date(scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  if (!endDate || endDate === scheduledDate) return start;
  return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
}

// Detalhe somente leitura do serviço — pontos e compostos a levar a campo.
// As ferramentas de impressão de etiqueta/cadeia de custódia em branco/
// checklist (que geram PDF/etiqueta física) continuam só no portal web por
// enquanto: abrir no navegador do celular funciona igual, só não tem uma
// tela nativa dedicada ainda.
export default function OrganizarServicoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesApi.get(id),
    enabled: !!id,
  });

  if (isLoading || !schedule) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: schedule.clientName ?? 'Serviço' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{schedule.clientName}</Text>
          <Text style={styles.meta}>{schedule.serviceTypeName}</Text>
          <Text style={styles.meta}>
            {formatPeriodo(schedule.scheduledDate, schedule.endDate, schedule.dateConfirmed)}
          </Text>
          <Text style={styles.meta}>
            {schedule.technicians.map((t) => t.name).join(', ') || 'Sem técnico definido'}
          </Text>
        </View>

        {schedule.samplingPoints.map((point) => (
          <View key={point.samplingPointId} style={styles.card}>
            <Text style={styles.pointTitle}>{point.samplingPointName ?? 'Ponto'}</Text>
            {point.compounds.map((compound) => (
              <View key={compound.id} style={styles.compoundRow}>
                <Text style={styles.compoundName}>
                  {compound.code} - {compound.name}
                </Text>
                <Text style={styles.compoundQty}>x{compound.quantity}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.note}>
          Etiquetas, cadeia de custódia em branco e checklist de campo: abra este serviço no
          portal web pra imprimir/preencher.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    gap: 4,
  },
  title: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 13 },
  pointTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  compoundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  compoundName: { fontSize: 13, color: '#1f2937' },
  compoundQty: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  note: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});
