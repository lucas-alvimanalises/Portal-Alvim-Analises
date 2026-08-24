import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FIELD_CHECKLIST_SECTIONS } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../../../lib/api/schedules.api';
import { fieldChecklistsApi } from '../../../../../../lib/api/field-checklists.api';
import { ColorPalette } from '../../../../../../lib/theme/palettes';
import { useThemeColors } from '../../../../../../lib/theme/ThemeContext';

// Check list de material de campo — mesmo conteúdo fixo do portal web (ver
// FIELD_CHECKLIST_SECTIONS), cada item com uma quantidade em vez de
// marcado/desmarcado. Um registro por agendamento; salvar de novo
// sobrescreve.
export default function ChecklistCampoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { data: schedule } = useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesApi.get(id),
    enabled: !!id,
  });

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['field-checklist', id],
    queryFn: () => fieldChecklistsApi.get(id),
    enabled: !!id,
  });

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

  function setQuantity(key: string, value: string) {
    const digits = value.replace(/[^0-9]/g, '');
    const parsed = digits === '' ? 0 : Math.max(0, parseInt(digits, 10));
    setQuantities((current) => ({ ...current, [key]: parsed }));
  }

  const totalItems = FIELD_CHECKLIST_SECTIONS.reduce((sum, section) => sum + section.items.length, 0);
  const filledCount = Object.values(quantities).filter((q) => q > 0).length;

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
              {checklist && ` Última vez por ${checklist.filledByName}.`}
            </Text>

            {FIELD_CHECKLIST_SECTIONS.map((section) => (
              <View key={section.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
                {section.items.map((item) => (
                  <View key={item.key} style={styles.itemRow}>
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
  });
}
