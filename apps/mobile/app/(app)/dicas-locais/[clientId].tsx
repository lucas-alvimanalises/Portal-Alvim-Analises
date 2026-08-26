import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, X } from 'lucide-react-native';
import {
  CreateLocalTipPayload,
  LOCAL_TIP_CATEGORY_LABELS_PT,
  LocalTipCategory,
  LocalTipDto,
  Role,
} from '@portal-alvim/shared';
import { localTipsApi } from '../../../lib/api/local-tips.api';
import { getApiErrorMessage } from '../../../lib/api/client';
import { useAuth } from '../../../lib/auth/AuthContext';
import { canOpenNavigation, openNavigationChoice } from '../../../lib/navigation-links';
import { radii, spacing } from '../../../lib/theme';
import { ColorPalette } from '../../../lib/theme/palettes';
import { useThemeColors } from '../../../lib/theme/ThemeContext';

const CATEGORIES = Object.values(LocalTipCategory);

function emptyForm(clientId: string): CreateLocalTipPayload {
  return { clientId, name: '', category: LocalTipCategory.FOOD, address: '', mapsUrl: '', notes: '' };
}

// Mural de dicas locais desta empresa — acessível a partir do detalhe do
// serviço ("Dicas do local", ao lado de "Como chegar"). Uso 100% interno:
// esta rota nunca é oferecida ao papel CLIENT (ver LocalTipsController).
export default function DicasLocaisScreen() {
  const { clientId, clientName } = useLocalSearchParams<{ clientId: string; clientName?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLocalTipPayload>(emptyForm(clientId));

  const { data: tips, isLoading } = useQuery({
    queryKey: ['local-tips', clientId],
    queryFn: () => localTipsApi.listByClient(clientId),
  });

  function resetForm() {
    setForm(emptyForm(clientId));
    setEditingId(null);
    setModalVisible(false);
  }

  function startCreate() {
    setForm(emptyForm(clientId));
    setEditingId(null);
    setModalVisible(true);
  }

  function startEdit(tip: LocalTipDto) {
    setForm({
      clientId,
      name: tip.name,
      category: tip.category,
      address: tip.address ?? '',
      mapsUrl: tip.mapsUrl ?? '',
      notes: tip.notes ?? '',
    });
    setEditingId(tip.id);
    setModalVisible(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => (editingId ? localTipsApi.update(editingId, form) : localTipsApi.create(form)),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['local-tips', clientId] });
    },
    onError: (error) =>
      Alert.alert('Não foi possível salvar', getApiErrorMessage(error, 'Tente novamente.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => localTipsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['local-tips', clientId] }),
    onError: (error) =>
      Alert.alert('Não foi possível excluir', getApiErrorMessage(error, 'Tente novamente.')),
  });

  function confirmDelete(tip: LocalTipDto) {
    Alert.alert('Excluir dica', `Excluir "${tip.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(tip.id) },
    ]);
  }

  function canModify(tip: LocalTipDto): boolean {
    if (!user) return false;
    return user.role === Role.ADMIN || user.role === Role.MANAGER || tip.createdById === user.id;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: clientName ? `Dicas — ${clientName}` : 'Dicas Locais',
          headerRight: () => (
            <Pressable onPress={startCreate} style={{ paddingHorizontal: 12 }}>
              <Plus size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={styles.list}
          data={tips}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Nenhuma dica cadastrada ainda. Toque em + pra ser o primeiro a indicar um lugar aqui.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{LOCAL_TIP_CATEGORY_LABELS_PT[item.category]}</Text>
                </View>
              </View>
              {item.address && (
                <Pressable
                  style={styles.addressRow}
                  disabled={!canOpenNavigation({ clientAddress: item.address, clientMapsUrl: item.mapsUrl })}
                  onPress={() =>
                    openNavigationChoice({ clientAddress: item.address, clientMapsUrl: item.mapsUrl })
                  }
                >
                  <MapPin size={13} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.addressText}>{item.address}</Text>
                </Pressable>
              )}
              {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.createdBy}>Por {item.createdByName}</Text>
                {canModify(item) && (
                  <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                    <Pressable onPress={() => startEdit(item)}>
                      <Text style={styles.actionLink}>Editar</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(item)}>
                      <Text style={[styles.actionLink, { color: colors.danger }]}>Excluir</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={resetForm}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={{ padding: spacing[4] }}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{editingId ? 'Editar Dica' : 'Nova Dica'}</Text>
                <Pressable onPress={resetForm}>
                  <X size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>Nome do lugar</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Ex.: Restaurante da Dona Maria"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.categoryPill, form.category === c && styles.categoryPillSelected]}
                    onPress={() => setForm((f) => ({ ...f, category: c }))}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        form.category === c && styles.categoryPillTextSelected,
                      ]}
                    >
                      {LOCAL_TIP_CATEGORY_LABELS_PT[c]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Endereço</Text>
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                placeholder="Rua, número, bairro..."
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Link do Google Maps (opcional)</Text>
              <TextInput
                style={styles.input}
                value={form.mapsUrl}
                onChangeText={(v) => setForm((f) => ({ ...f, mapsUrl: v }))}
                placeholder="https://maps.google.com/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Observação</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder='Ex.: "Fecha 22h, só dinheiro"'
                placeholderTextColor={colors.textMuted}
                multiline
              />

              {!form.name.trim() && (
                <Text style={styles.warning}>Informe ao menos o nome do lugar.</Text>
              )}
            </ScrollView>

            <View style={styles.actions}>
              <Pressable style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton,
                  (!form.name.trim() || saveMutation.isPending) && styles.confirmButtonDisabled,
                ]}
                disabled={!form.name.trim() || saveMutation.isPending}
                onPress={() => saveMutation.mutate()}
              >
                <Text style={styles.confirmButtonText}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    list: { padding: spacing[4], gap: spacing[2] },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: spacing[5] },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing[4],
      marginBottom: spacing[2],
      gap: 6,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
    categoryBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.pill,
    },
    categoryBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    addressText: { fontSize: 13, color: colors.primary },
    notes: { fontSize: 13, color: colors.textMuted },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    createdBy: { fontSize: 11, color: colors.textMuted },
    actionLink: { fontSize: 12, fontWeight: '600', color: colors.primary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      maxHeight: '88%',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[4],
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2], marginTop: spacing[3] },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: spacing[3],
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    categoryPill: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    categoryPillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryPillText: { fontSize: 13, color: colors.text },
    categoryPillTextSelected: { color: '#fff', fontWeight: '600' },
    warning: { fontSize: 12, color: colors.danger, marginTop: spacing[3] },
    actions: {
      flexDirection: 'row',
      gap: spacing[2],
      padding: spacing[4],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
    confirmButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingVertical: 12,
      alignItems: 'center',
    },
    confirmButtonDisabled: { opacity: 0.5 },
    confirmButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  });
}
