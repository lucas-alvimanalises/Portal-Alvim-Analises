import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COMPLIANCE_STATUS_COLORS, COMPLIANCE_STATUS_LABELS_PT, ComplianceStatus, SampleDto } from '@portal-alvim/shared';
import { samplesApi } from '../../../../lib/api/samples.api';

// Pior situação entre os parâmetros lançados nessa amostra — mesma regra
// usada pra decidir se uma linha "chama atenção" no portal web (Fora da
// especificação pesa mais que Atenção, que pesa mais que Conforme).
const SEVERITY: Record<ComplianceStatus, number> = {
  [ComplianceStatus.NAO_CONFORME]: 2,
  [ComplianceStatus.ATENCAO]: 1,
  [ComplianceStatus.CONFORME]: 0,
};

function worstCompliance(sample: SampleDto): ComplianceStatus | null {
  let worst: ComplianceStatus | null = null;
  for (const row of sample.resultRows) {
    if (!row.compliance) continue;
    if (!worst || SEVERITY[row.compliance] > SEVERITY[worst]) worst = row.compliance;
  }
  return worst;
}

// Nível 2 do Histórico — versão simplificada (sem gráfico de tendência):
// lista as amostras já coletadas dessa empresa, mais recentes primeiro, com
// a situação (pior parâmetro lançado) em destaque.
export default function HistoricoClienteScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['samples', 'client', clientId],
    queryFn: () => samplesApi.listByClient(clientId),
    enabled: !!clientId,
  });

  const samples = (data ?? [])
    .filter((s) => s.active)
    .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime());

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Histórico' }} />
      <FlatList
        contentContainerStyle={styles.list}
        data={samples}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma amostra coletada ainda.</Text>}
        renderItem={({ item }) => {
          const compliance = worstCompliance(item);
          const colors = compliance ? COMPLIANCE_STATUS_COLORS[compliance] : null;
          return (
            <View style={styles.card}>
              <Text style={styles.compound}>
                {item.compoundCode ? `${item.compoundCode} - ` : ''}
                {item.compoundName ?? 'Análise'}
              </Text>
              <Text style={styles.meta}>{item.samplingPointName ?? 'Ponto não definido'}</Text>
              <Text style={styles.meta}>
                {new Date(item.collectionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </Text>
              {colors && (
                <View style={[styles.badge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>
                    {COMPLIANCE_STATUS_LABELS_PT[compliance!]}
                  </Text>
                </View>
              )}
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
  compound: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 13 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
