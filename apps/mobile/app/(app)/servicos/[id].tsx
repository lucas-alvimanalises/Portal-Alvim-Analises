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
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { SCHEDULE_DERIVED_STATUS_COLORS, SCHEDULE_DERIVED_STATUS_LABELS_PT } from '@portal-alvim/shared';
import { schedulesApi } from '../../../lib/api/schedules.api';
import { servicePhotosApi, MobileUploadFile } from '../../../lib/api/service-photos.api';
import { API_URL } from '../../../lib/api/client';
import { tokenStorage } from '../../../lib/auth/storage';

// Hub de campo pro serviço: reúne aqui o que o técnico precisa fazer no
// local, em vez de espalhar em telas separadas — mesmas 3 ações citadas
// pelo usuário (fotos, comentários de coleta; cadeia de custódia entra
// numa fase seguinte). Espelha as seções "Fotos do Serviço" e
// "Comentários de coleta" da tela /agendamentos/[id]/resultados do portal
// web (ver ServicePhotosSection.tsx / ScheduleCommentsSection.tsx), sem o
// restante da tela (análises/resultados continuam só no portal web nesta
// fase).
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
});
