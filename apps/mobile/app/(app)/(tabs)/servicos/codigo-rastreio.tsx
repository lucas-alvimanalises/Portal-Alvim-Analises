import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TRACKING_SHIPMENT_STATUS_COLORS,
  TRACKING_SHIPMENT_STATUS_LABELS_PT,
  TrackingShipmentDto,
  TrackingShipmentStatus,
} from '@portal-alvim/shared';
import { trackingShipmentsApi } from '../../../../lib/api/tracking-shipments.api';
import { getApiErrorMessage } from '../../../../lib/api/client';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

function openCorreios() {
  Linking.openURL('https://rastreamento.correios.com.br/app/index.php');
}

// Log de envios de amostras pelos Correios pro laboratório parceiro — mesma
// tela do portal web, versão mobile (pedido do usuário: acesso pelo app
// também). Site dos Correios exige captcha em toda consulta, então só abre
// o site oficial (sem copiar pro clipboard aqui — evita depender de um
// módulo nativo novo só pra isso).
export default function CodigoRastreioScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['tracking-shipments'],
    queryFn: trackingShipmentsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: trackingShipmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-shipments'] });
      setTrackingCode('');
      setDescription('');
      setShowForm(false);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Não foi possível cadastrar o código.')),
  });

  const deliverMutation = useMutation({
    mutationFn: (id: string) => trackingShipmentsApi.markDelivered(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracking-shipments'] }),
  });

  function handleSubmit() {
    if (!trackingCode.trim() || !description.trim()) return;
    createMutation.mutate({ trackingCode: trackingCode.trim(), description: description.trim() });
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Código de Rastreio' }} />
      <View style={styles.container}>
        <Pressable style={styles.primaryButton} onPress={() => setShowForm((v) => !v)}>
          <Text style={styles.primaryButtonText}>
            {showForm ? 'Cancelar' : 'Cadastrar Código de Rastreio'}
          </Text>
        </Pressable>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.label}>Código de rastreio</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: AA123456785BR"
              value={trackingCode}
              onChangeText={setTrackingCode}
              autoCapitalize="characters"
            />
            <Text style={styles.label}>Descrição do que está sendo enviado</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex.: Amostras de Siloxanos e VOCs — Cliente X"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
            <Pressable
              style={[styles.primaryButton, createMutation.isPending && styles.disabled]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Text>
            </Pressable>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            style={{ marginTop: 16 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            data={shipments ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum código de rastreio cadastrado ainda.</Text>}
            renderItem={({ item }: { item: TrackingShipmentDto }) => {
              const colors = TRACKING_SHIPMENT_STATUS_COLORS[item.status];
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.code}>{item.trackingCode}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>
                        {TRACKING_SHIPMENT_STATUS_LABELS_PT[item.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.description}>{item.description}</Text>
                  <Text style={styles.meta}>
                    Postado em {formatDateTime(item.postedAt)}
                    {item.createdBy && ` por ${item.createdBy.name}`}
                    {item.status === TrackingShipmentStatus.DELIVERED &&
                      item.deliveredAt &&
                      ` · Entregue em ${formatDateTime(item.deliveredAt)}`}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryButton} onPress={openCorreios}>
                      <Text style={styles.secondaryButtonText}>Rastrear nos Correios</Text>
                    </Pressable>
                    {item.status === TrackingShipmentStatus.IN_TRANSIT && (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => deliverMutation.mutate(item.id)}
                        disabled={deliverMutation.isPending}
                      >
                        <Text style={styles.secondaryButtonText}>Marcar como entregue</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  primaryButton: {
    backgroundColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.6 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    padding: 16,
    marginTop: 12,
    gap: 4,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e5e9',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginTop: 4,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  error: { color: '#b3261e', fontSize: 13, marginTop: 8 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    padding: 16,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  code: { fontSize: 15, fontWeight: '700' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 14 },
  meta: { fontSize: 12, color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#e2e5e9',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '600', color: '#1c1f24' },
});
