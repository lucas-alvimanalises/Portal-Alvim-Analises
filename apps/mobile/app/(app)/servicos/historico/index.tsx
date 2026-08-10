import { FlatList, Text, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ClientStatus } from '@portal-alvim/shared';
import { clientsApi } from '../../../../lib/api/clients.api';

// Nível 1 do Histórico (mesmo espírito do portal web — ver historico/page.tsx
// no web, que já filtra por status === ACTIVE): lista de empresas ativas —
// toca numa pra ver as amostras/resultados recentes daquele cliente. Versão
// simplificada nesta fase: sem gráfico de tendência, só lista dos últimos
// resultados lançados (ver [clientId].tsx).
export default function HistoricoEmpresasScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  const clients = (data ?? []).filter((c) => c.status === ClientStatus.ACTIVE);

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
        data={clients}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma empresa cadastrada.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/servicos/historico/${item.id}` as never)}
          >
            <Text style={styles.name}>{item.companyName}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '600' },
  chevron: { fontSize: 20, color: '#9ca3af' },
});
