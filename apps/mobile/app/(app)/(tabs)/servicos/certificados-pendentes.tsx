import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PendingCertificateDto } from '@portal-alvim/shared';
import { samplesApi } from '../../../../lib/api/samples.api';
import { colors, radii, shadow, spacing } from '../../../../lib/theme';

function formatServiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Consolida, de todos os serviços, as amostras/análises sem certificado de
// laboratório anexado — mesma fonte de dados do bloco "Certificados
// Pendentes" do portal web (samples/pending-certificates). Acessada pelo
// card "Ação necessária" da Home.
export default function CertificadosPendentesScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['pending-certificates'],
    queryFn: samplesApi.listPendingCertificates,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Certificados Pendentes' }} />
      <FlatList
        contentContainerStyle={styles.list}
        data={data}
        keyExtractor={(item) => item.sampleId}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum certificado pendente.</Text>}
        renderItem={({ item }: { item: PendingCertificateDto }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/servicos/${item.scheduleId}` as never)}
          >
            <Text style={styles.client}>{item.clientName}</Text>
            <Text style={styles.meta}>{item.serviceTypeName}</Text>
            <Text style={styles.meta}>
              {item.samplingPointName} · {item.compoundLabel}
            </Text>
            <Text style={styles.meta}>
              {formatServiceDate(item.serviceDate)} · {item.technicianNames.join(', ') || 'Sem técnico definido'}
            </Text>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing[4], gap: spacing[2] },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[2],
    gap: 2,
    ...shadow,
  },
  cardPressed: { backgroundColor: colors.surfaceMuted },
  client: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12 },
});
