import { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { API_URL } from '../../../../lib/api/client';
import { tokenStorage } from '../../../../lib/auth/storage';

function formatPeriodo(scheduledDate: string, endDate: string | null, dateConfirmed: boolean): string {
  if (!dateConfirmed) {
    return new Date(scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  }
  const start = new Date(scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  if (!endDate || endDate === scheduledDate) return start;
  return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
}

// Detalhe do serviço com as ferramentas de campo: baixar/compartilhar a
// cadeia de custódia em branco (pra imprimir onde der, ou levar aberta no
// celular) e preencher o check list de material. Impressão de etiqueta
// Zebra continua só no portal web — a impressora fica ligada num
// computador do escritório, não faz sentido operar via celular (decisão
// tomada com o usuário).
export default function OrganizarServicoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [downloadingCustody, setDownloadingCustody] = useState(false);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesApi.get(id),
    enabled: !!id,
  });

  async function downloadAndShareCustodyPdf() {
    setDownloadingCustody(true);
    try {
      const token = await tokenStorage.getAccessToken();
      const fileUri = `${FileSystem.cacheDirectory}cadeia-custodia-${id}.pdf`;
      const result = await FileSystem.downloadAsync(`${API_URL}/custody-extractions/blank/${id}`, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (result.status !== 200) {
        throw new Error(`status ${result.status}`);
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Cadeia de Custódia em branco',
        });
      } else {
        Alert.alert('Baixado', `PDF salvo em ${result.uri}, mas este dispositivo não suporta compartilhar/abrir direto.`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível baixar a cadeia de custódia. Tente novamente.');
    } finally {
      setDownloadingCustody(false);
    }
  }

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

        <View style={styles.card}>
          <Pressable
            style={styles.actionButton}
            onPress={downloadAndShareCustodyPdf}
            disabled={downloadingCustody}
          >
            <Text style={styles.actionButtonText}>
              {downloadingCustody ? 'Baixando...' : 'Cadeia de Custódia (baixar/compartilhar)'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push(`/agenda/organizar-servico/${id}/checklist` as never)}
          >
            <Text style={styles.actionButtonText}>Preencher Check List de Campo</Text>
          </Pressable>
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
          Etiquetas (Zebra ZD-220): continuam só no portal web, no computador ligado à impressora.
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
  note: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  actionButton: {
    backgroundColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
