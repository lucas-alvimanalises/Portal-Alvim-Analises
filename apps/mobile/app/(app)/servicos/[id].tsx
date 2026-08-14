import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  ANALYSIS_STATUS_LABELS_PT,
  CustodyExtractionStatus,
  SCHEDULE_DERIVED_STATUS_COLORS,
  SCHEDULE_DERIVED_STATUS_LABELS_PT,
  SampleDto,
} from '@portal-alvim/shared';
import { schedulesApi } from '../../../lib/api/schedules.api';
import { servicePhotosApi, MobileUploadFile } from '../../../lib/api/service-photos.api';
import { samplesApi } from '../../../lib/api/samples.api';
import { custodyExtractionsApi } from '../../../lib/api/custody-extractions.api';
import { API_URL } from '../../../lib/api/client';
import { tokenStorage } from '../../../lib/auth/storage';

// Hub de campo pro serviço: reúne aqui o que o técnico precisa fazer no
// local — fotos, comentários de coleta e, por composto/ponto configurado,
// criar a amostra e cadastrar a cadeia de custódia (fotografando o papel
// preenchido ou digitando na mão). Espelha as seções equivalentes do portal
// web (ServicePhotosSection/ScheduleCommentsSection/AnalysisSlot +
// CustodyExtractionSection), simplificado pro celular: a tabela de
// amostragem em si (revisão dos campos lidos pela IA) fica numa tela à
// parte, ver /cadeia-custodia/[extractionId].
function formatPeriodo(scheduledDate: string, endDate: string | null, dateConfirmed: boolean): string {
  if (!dateConfirmed) {
    return new Date(scheduledDate).toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    });
  }
  const start = new Date(scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const end = endDate && endDate !== scheduledDate
    ? new Date(endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : null;
  return end ? `${start} a ${end}` : start;
}

const CUSTODY_STATUS_LABELS_PT: Record<CustodyExtractionStatus, string> = {
  PROCESSING: 'IA lendo...',
  NEEDS_REVIEW: 'Aguardando revisão',
  APPROVED: 'Aprovada',
  FAILED: 'Falha na leitura',
};
const CUSTODY_STATUS_COLORS: Record<CustodyExtractionStatus, { background: string; text: string }> = {
  PROCESSING: { background: '#e0e7ff', text: '#3730a3' },
  NEEDS_REVIEW: { background: '#fef9c3', text: '#854d0e' },
  APPROVED: { background: '#dcfce7', text: '#15803d' },
  FAILED: { background: '#fee2e2', text: '#b91c1c' },
};

interface AmostraSlotProps {
  clientId: string;
  scheduleId: string;
  samplingPointId: string;
  compoundId: string;
  compoundLabel: string;
  slotNumber: number;
  totalSlots: number;
  sample?: SampleDto;
  defaultCollectionDate: string;
}

// Um "slot" = uma amostra esperada (ponto + composto + posição, ex.: "2ª
// amostra de Siloxanos") — mesma lógica de AnalysisSlot.tsx no portal web.
// Fechado por padrão; abrir revela o botão de criar a amostra (se ainda não
// existe) ou as ações de cadeia de custódia (se já existe).
function AmostraSlot({
  clientId,
  scheduleId,
  samplingPointId,
  compoundId,
  compoundLabel,
  slotNumber,
  totalSlots,
  sample,
  defaultCollectionDate,
}: AmostraSlotProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const createSampleMutation = useMutation({
    mutationFn: () =>
      samplesApi.create({
        clientId,
        scheduleId,
        samplingPointId,
        compoundId,
        collectionDate: defaultCollectionDate,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['samples', 'schedule', scheduleId] }),
  });

  const { data: extractions } = useQuery({
    queryKey: ['custody-extractions', sample?.id],
    queryFn: () => custodyExtractionsApi.listBySample(sample!.id),
    enabled: !!sample && isOpen,
  });

  // Só uma cadeia de custódia ativa por amostra (mesma regra do backend) —
  // uma tentativa que falhou na leitura não conta.
  const activeExtraction = (extractions ?? []).find((e) => e.status !== 'FAILED');
  const failedExtractions = (extractions ?? []).filter((e) => e.status === 'FAILED');

  const manualMutation = useMutation({
    mutationFn: () => custodyExtractionsApi.createManual(sample!.id),
    onSuccess: (extraction) => {
      queryClient.invalidateQueries({ queryKey: ['custody-extractions', sample!.id] });
      router.push(`/cadeia-custodia/${extraction.id}` as never);
    },
  });

  async function scanCustody() {
    if (!sample) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à câmera pra continuar.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;

    setScanning(true);
    try {
      const asset = result.assets[0];
      const file: MobileUploadFile = {
        uri: asset.uri,
        name: asset.fileName ?? `cadeia-custodia-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      };
      const extraction = await custodyExtractionsApi.upload(sample.id, file);
      queryClient.invalidateQueries({ queryKey: ['custody-extractions', sample.id] });
      router.push(`/cadeia-custodia/${extraction.id}` as never);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setScanning(false);
    }
  }

  const label = totalSlots > 1 ? `${compoundLabel} — Amostra ${slotNumber} de ${totalSlots}` : compoundLabel;
  const custodyColors = activeExtraction ? CUSTODY_STATUS_COLORS[activeExtraction.status] : null;

  return (
    <View style={styles.slot}>
      <Pressable style={styles.slotHeader} onPress={() => setIsOpen((open) => !open)}>
        <Text style={styles.slotLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {sample ? (
            <View style={[styles.miniBadge, { backgroundColor: '#eef2f1' }]}>
              <Text style={styles.miniBadgeText}>{ANALYSIS_STATUS_LABELS_PT[sample.analysisStatus]}</Text>
            </View>
          ) : (
            <Text style={styles.slotEmptyLabel}>Não iniciada</Text>
          )}
          <Text style={styles.slotChevron}>{isOpen ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {isOpen && (
        <View style={styles.slotBody}>
          {!sample ? (
            <Pressable
              style={styles.actionButton}
              onPress={() => createSampleMutation.mutate()}
              disabled={createSampleMutation.isPending}
            >
              <Text style={styles.actionButtonText}>
                {createSampleMutation.isPending ? 'Criando...' : 'Criar amostra'}
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={styles.custodyTitle}>Cadeia de Custódia</Text>

              {activeExtraction ? (
                <Pressable
                  style={[styles.custodyStatusRow, { backgroundColor: custodyColors!.background }]}
                  onPress={() => router.push(`/cadeia-custodia/${activeExtraction.id}` as never)}
                >
                  <Text style={[styles.custodyStatusText, { color: custodyColors!.text }]}>
                    {CUSTODY_STATUS_LABELS_PT[activeExtraction.status]}
                  </Text>
                  <Text style={[styles.custodyStatusText, { color: custodyColors!.text }]}>Ver/editar ›</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable style={styles.actionButton} onPress={scanCustody} disabled={scanning}>
                    <Text style={styles.actionButtonText}>
                      {scanning ? 'Enviando...' : 'Fotografar cadeia preenchida'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionButtonSecondary}
                    onPress={() => manualMutation.mutate()}
                    disabled={manualMutation.isPending}
                  >
                    <Text style={styles.actionButtonSecondaryText}>
                      {manualMutation.isPending ? 'Abrindo...' : 'Preencher manualmente'}
                    </Text>
                  </Pressable>
                  {failedExtractions.length > 0 && (
                    <Text style={styles.custodyFailedHint}>
                      {failedExtractions.length} tentativa(s) de leitura falharam — tente de novo.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ServicoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    tokenStorage.getAccessToken().then((token) => {
      if (token) setAuthHeader(`Bearer ${token}`);
    });
  }, []);

  const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesApi.get(id),
    enabled: !!id,
  });

  const { data: samples } = useQuery({
    queryKey: ['samples', 'schedule', id],
    queryFn: () => samplesApi.listBySchedule(id),
    enabled: !!id,
  });

  const { data: photos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['service-photos', id],
    queryFn: () => servicePhotosApi.list(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (schedule) setComments(schedule.internalComments ?? '');
  }, [schedule?.internalComments]);

  const commentsMutation = useMutation({
    mutationFn: (internalComments: string) => schedulesApi.updateComments(id, { internalComments }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules', id] }),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => servicePhotosApi.delete(photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-photos', id] }),
  });

  async function pickAndUpload(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso pra continuar.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });

    if (result.canceled) return;

    setUploading(true);
    try {
      for (const asset of result.assets) {
        const file: MobileUploadFile = {
          uri: asset.uri,
          name: asset.fileName ?? `foto-${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        };
        await servicePhotosApi.upload(id, file);
      }
      queryClient.invalidateQueries({ queryKey: ['service-photos', id] });
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  function confirmDeletePhoto(photoId: string) {
    Alert.alert('Excluir foto', 'Tem certeza que deseja excluir esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deletePhotoMutation.mutate(photoId) },
    ]);
  }

  if (isLoadingSchedule) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const colors = schedule ? SCHEDULE_DERIVED_STATUS_COLORS[schedule.derivedStatus] : null;

  // Agrupa amostras já existentes por ponto+composto, ordenadas por criação
  // — a i-ésima amostra criada pro par vira o slot i (mesma lógica de
  // groupSamplesBySlot em resultados/page.tsx no portal web).
  const activeSamples = (samples ?? []).filter((s) => s.active);
  const samplesBySlot = new Map<string, SampleDto[]>();
  [...activeSamples]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((sample) => {
      if (!sample.samplingPointId || !sample.compoundId) return;
      const key = `${sample.samplingPointId}|${sample.compoundId}`;
      const list = samplesBySlot.get(key) ?? [];
      list.push(sample);
      samplesBySlot.set(key, list);
    });

  return (
    <>
      <Stack.Screen options={{ title: schedule?.clientName ?? 'Serviço' }} />
      <ScrollView contentContainerStyle={styles.container}>
        {schedule && (
          <View style={styles.header}>
            <Text style={styles.client}>{schedule.clientName ?? '-'}</Text>
            <Text style={styles.meta}>{schedule.serviceTypeName ?? '-'}</Text>
            <Text style={styles.meta}>
              {formatPeriodo(schedule.scheduledDate, schedule.endDate, schedule.dateConfirmed)}
            </Text>
            {colors && (
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {SCHEDULE_DERIVED_STATUS_LABELS_PT[schedule.derivedStatus]}
                </Text>
              </View>
            )}
          </View>
        )}

        {schedule && schedule.samplingPoints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amostras e Cadeia de Custódia</Text>
            <Text style={styles.sectionHint}>
              Toque num composto pra criar a amostra e/ou fotografar a cadeia de custódia preenchida.
            </Text>
            <View style={{ gap: 10 }}>
              {schedule.samplingPoints.map((point) => (
                <View key={point.samplingPointId}>
                  <Text style={styles.pointTitle}>{point.samplingPointName ?? 'Ponto'}</Text>
                  <View style={{ gap: 8, marginTop: 6 }}>
                    {point.compounds.map((compound) => {
                      const key = `${point.samplingPointId}|${compound.id}`;
                      const existing = samplesBySlot.get(key) ?? [];
                      const totalSlots = Math.max(compound.quantity, existing.length);
                      return Array.from({ length: totalSlots }, (_, index) => (
                        <AmostraSlot
                          key={`${key}-${index}`}
                          clientId={schedule.clientId}
                          scheduleId={schedule.id}
                          samplingPointId={point.samplingPointId}
                          compoundId={compound.id}
                          compoundLabel={`${compound.code} - ${compound.name}`}
                          slotNumber={index + 1}
                          totalSlots={totalSlots}
                          sample={existing[index]}
                          defaultCollectionDate={schedule.scheduledDate.slice(0, 10)}
                        />
                      ));
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Fotos do Serviço</Text>
          </View>
          <View style={styles.photoButtonsRow}>
            <Pressable
              style={styles.photoButton}
              onPress={() => pickAndUpload('camera')}
              disabled={uploading}
            >
              <Text style={styles.photoButtonText}>Tirar foto</Text>
            </Pressable>
            <Pressable
              style={styles.photoButton}
              onPress={() => pickAndUpload('library')}
              disabled={uploading}
            >
              <Text style={styles.photoButtonText}>Escolher da galeria</Text>
            </Pressable>
          </View>
          {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}

          {isLoadingPhotos ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : !photos || photos.length === 0 ? (
            <Text style={styles.empty}>Nenhuma foto enviada ainda.</Text>
          ) : (
            <FlatList
              data={photos}
              horizontal
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 10, marginTop: 10 }}
              renderItem={({ item }) => (
                <View style={styles.photoCard}>
                  <Image
                    source={{
                      uri: servicePhotosApi.fileUrl(item.id, API_URL),
                      headers: authHeader ? { Authorization: authHeader } : undefined,
                    }}
                    style={styles.photoImage}
                  />
                  <Pressable style={styles.photoDelete} onPress={() => confirmDeletePhoto(item.id)}>
                    <Text style={styles.photoDeleteText}>Excluir</Text>
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comentários de coleta Alvim Análises</Text>
          <Text style={styles.sectionHint}>
            Anotações do técnico sobre a coleta (uso interno — o cliente não visualiza este campo).
          </Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={4}
            value={comments}
            onChangeText={setComments}
            onBlur={() => commentsMutation.mutate(comments)}
          />
          {commentsMutation.isPending && <Text style={styles.saving}>Salvando...</Text>}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 16 },
  header: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    gap: 4,
  },
  client: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 13 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e5e9',
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  empty: { fontSize: 13, color: '#6b7280', marginTop: 8 },
  pointTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  photoButtonsRow: { flexDirection: 'row', gap: 10 },
  photoButton: {
    flex: 1,
    backgroundColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  photoCard: { width: 140, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e5e9' },
  photoImage: { width: 140, height: 100 },
  photoDelete: { padding: 6, alignItems: 'center' },
  photoDeleteText: { color: '#b3261e', fontSize: 12, fontWeight: '600' },
  textarea: {
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#e2e5e9',
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saving: { fontSize: 11, color: '#6b7280', marginTop: 6 },
  slot: { borderWidth: 1, borderColor: '#e2e5e9', borderRadius: 6 },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  slotLabel: { fontSize: 13, color: '#1f2937', flexShrink: 1 },
  slotEmptyLabel: { fontSize: 12, color: '#9ca3af' },
  slotChevron: { fontSize: 11, color: '#9ca3af' },
  slotBody: { padding: 10, paddingTop: 0 },
  miniBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  miniBadgeText: { fontSize: 11, fontWeight: '600', color: '#1f5f4d' },
  actionButton: {
    backgroundColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  actionButtonSecondary: {
    borderWidth: 1,
    borderColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonSecondaryText: { color: '#1f5f4d', fontWeight: '600', fontSize: 13 },
  custodyTitle: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  custodyStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  custodyStatusText: { fontSize: 13, fontWeight: '600' },
  custodyFailedHint: { fontSize: 11, color: '#b91c1c' },
});
