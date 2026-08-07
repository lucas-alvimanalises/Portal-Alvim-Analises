import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ContractScopeDto } from '@portal-alvim/shared';
import { contractsApi } from '../../lib/api/contracts.api';

// Somente leitura nesta fase: o cliente visualiza seus contratos/serviços.
// O backend já escopa a lista para o cliente logado (RBAC).
export default function MeusServicosScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-contracts'],
    queryFn: contractsApi.list,
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
      ListEmptyComponent={<Text style={styles.empty}>Nenhum contrato encontrado.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            Início: {new Date(item.startDate).toLocaleDateString('pt-BR')}
          </Text>
          <Text style={styles.meta}>
            Escopo: {item.scopes.map((s: ContractScopeDto) => s.serviceType.name).join(', ') || '-'}
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
  name: { fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 4, color: '#6b7280', fontSize: 13 },
});
