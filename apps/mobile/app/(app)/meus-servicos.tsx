import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ContractScopeDto } from '@portal-alvim/shared';
import { contractsApi } from '../../lib/api/contracts.api';
import { ColorPalette } from '../../lib/theme/palettes';
import { useThemeColors } from '../../lib/theme/ThemeContext';

// Somente leitura nesta fase: o cliente visualiza seus contratos/serviços.
// O backend já escopa a lista para o cliente logado (RBAC).
export default function MeusServicosScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
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
      style={{ backgroundColor: colors.bg }}
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

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    list: { padding: 16, gap: 12, backgroundColor: colors.bg },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    meta: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
  });
}
