import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChecklistSectionDto, FieldChecklistAttachmentDto } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../../../lib/api/schedules.api';
import { fieldChecklistsApi } from '../../../../../../lib/api/field-checklists.api';
import { MobileUploadFile } from '../../../../../../lib/api/service-photos.api';
import { tokenStorage } from '../../../../../../lib/auth/storage';
import { ColorPalette } from '../../../../../../lib/theme/palettes';
import { useThemeColors } from '../../../../../../lib/theme/ThemeContext';

// Check list de material de campo — catálogo de seções/itens vem do banco
// (editável só pelo portal web, ver ChecklistCatalogService; o app só lê),
// cada item com uma quantidade em vez de marcado/desmarcado. Um registro
// por agendamento; salvar de novo sobrescreve. Quem prefere papel imprime
// o modelo em branco (pelo portal web), preenche à mão e anexa a(s)
// foto(s) aqui — convive com o preenchimento digital.
export default function ChecklistCampoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    tokenStorage.getAccessToken().then((token) => {
      if (token) setAuthHeader(`Bearer ${token}`);
    });
  }, []);

  const { data: schedule } = useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesApi.get(id),
    enabled: !!id,
  });

  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['checklist-sections'],
    queryFn: fieldChecklistsApi.listSections,
  });

  const { data: checklist, isLoading: isLoadingChecklist } = useQuery({
    queryKey: ['field-checklist', id],
    queryFn: () => fieldChecklistsApi.get(id),
    enabled: !!id,
  });
  const isLoading = isLoadingSections || isLoadingChecklist;

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && checklist !== undefined) {
      setQuantities(checklist?.quantities ?? {});
      setInitialized(true);
    }
  }, [checklist, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => fieldChecklistsApi.save(id, { quantities }),
    onSuccess: (saved) => queryClient.setQueryData(['field-checklist', id], saved),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => fieldChecklistsApi.deleteAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['field-checklist', id] }),
  });

  function setQuantity(key: string, value: string) {
    const digits = value.replace(/[^0-9]/g, '');
    const parsed = digits === '' ? 0 : Math.max(0, parseInt(digits, 10));
    setQuantities((current) => ({ ...current, [key]: parsed }));
  }

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
      let last;
      for (const asset of result.assets) {
        const file: MobileUploadFile = {
          uri: asset.uri,
          name: asset.fileName ?? `checklist-${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        };
        last = await fieldChecklistsApi.uploadAttachment(id, file);
      }
      if (last) queryClient.setQueryData(['field-checklist', id], last);
    } catch {
      Alert.alert('Erro', 'Não foi possível anexar. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  function confirmDeleteAttachment(attachmentId: string, filename: string) {
    Alert.alert('Remover anexo', `Remover "${filename}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => deleteAttachmentMutation.mutate(attachmentId),
      },
    ]);
  }

  const typedSections: ChecklistSectionDto[] = sections ?? [];
  const totalItems = typedSections.reduce((sum, section) => sum + section.items.length, 0);
  const filledCount = Object.values(quantities).filter((q) => q > 0).length;
  const attachments: FieldChecklistAttachmentDto[] = checklist?.attachments ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Check List de Campo' }} />
      <ScrollView contentContainerStyle={styles.container}>
        {schedule && (
          <Text style={styles.subtitle}>
            {schedule.clientName} — {schedule.serviceTypeName}
          </Text>
        )}

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <>
            <Text style={styles.progress}>
              {filledCount}/{totalItems} itens com quantidade.
              {checklist && checklist.filledByName && ` Última vez por ${checklist.filledByName}.`}
            </Text>

            {typedSections.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
                {section.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <TextInput
                      style={styles.qtyInput}
                      keyboardType="number-pad"
                      value={quantities[item.key] ? String(quantities[item.key]) : ''}
                      placeholder="0"
                      onChangeText={(value) => setQuantity(item.key, value)}
                    />
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            ))}

            <Pressable
              style={styles.saveButton}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Text style={styles.saveButtonText}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Text>
            </Pressable>
            {saveMutation.isSuccess && <Text style={styles.savedText}>✓ Salvo</Text>}
            {saveMutation.isError && <Text style={styles.errorText}>Não foi possível salvar.</Text>}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Checklist preenchido (papel)</Text>
              <Text style={styles.progress}>
                Preencheu no papel? Fotografe aqui a folha marcada à mão (pode anexar várias).
              </Text>

              <View style={styles.attachButtons}>
                <Pressable
                  style={[styles.attachButton, uploading && styles.disabled]}
                  onPress={() => pickAndUpload('camera')}
                  disabled={uploading}
                >
                  <Text style={styles.attachButtonText}>Tirar foto</Text>
                </Pressable>
                <Pressable
                  style={[styles.attachButton, uploading && styles.disabled]}
                  onPress={() => pickAndUpload('library')}
                  disabled={uploading}
                >
                  <Text style={styles.attachButtonText}>Da galeria</Text>
                </Pressable>
              </View>
              {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}

              {attachments.length > 0 && (
                <View style={styles.thumbGrid}>
                  {attachments.map((att) => (
                    <Pressable
                      key={att.id}
                      style={styles.thumbWrap}
                      onLongPress={() => confirmDeleteAttachment(att.id, att.filename)}
                    >
                      {att.mimeType.startsWith('image/') ? (
                        <Image
                          style={styles.thumb}
                          source={{
                            uri: fieldChecklistsApi.attachmentFileUrl(att.id),
                            headers: authHeader ? { Authorization: authHeader } : undefined,
                          }}
                        />
                      ) : (
                        <View style={[styles.thumb, styles.pdfThumb]}>
                          <Text style={styles.pdfText}>PDF</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
              {attachments.length > 0 && (
                <Text style={styles.hint}>Segure um anexo pra remover.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { padding: 16, gap: 12, paddingBottom: 40, backgroundColor: colors.bg },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
    progress: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2, color: colors.text },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyInput: {
      width: 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 6,
      textAlign: 'center',
      backgroundColor: colors.surfaceMuted,
      color: colors.text,
    },
    itemLabel: { fontSize: 13, color: colors.text, flexShrink: 1 },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: { color: '#fff', fontWeight: '600' },
    savedText: { color: colors.primary, fontSize: 13, textAlign: 'center' },
    errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
    attachButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
    attachButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    attachButtonText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    disabled: { opacity: 0.5 },
    thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    thumbWrap: { borderRadius: 6, overflow: 'hidden' },
    thumb: { width: 92, height: 92, borderRadius: 6, backgroundColor: colors.surfaceMuted },
    pdfThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    pdfText: { color: colors.textMuted, fontWeight: '700' },
    hint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  });
}
