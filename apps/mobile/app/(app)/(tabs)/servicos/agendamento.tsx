import { FlatList, Text, View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  isScheduleRealized,
  SCHEDULE_DERIVED_STATUS_COLORS,
  SCHEDULE_DERIVED_STATUS_LABELS_PT,
  ScheduleDto,
  ScheduleStatus,
} from '@portal-alvim/shared';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { ColorPalette } from '../../../../lib/theme/palettes';
import { useThemeColors } from '../../../../lib/theme/ThemeContext';

// Mesmo critério do portal web (ScheduleListView): serviços que ainda vão
// acontecer — sai da lista automaticamente assim que "realizado" (ver
// isScheduleRealized), sem baixa manual. Somente leitura aqui — editar
// agendamento continua só no portal web por enquanto.
function formatPeriodo(schedule: ScheduleDto): string {
  if (schedule.dateConfirmed) {
    const start = new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const end =
      schedule.endDate && schedule.endDate !== schedule.scheduledDate
        ? new Date(schedule.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : null;
    return end ? `${start} a ${end}` : start;
  }
  return new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
}

export default function AgendamentoScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { data, isLoading } = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });

  const schedules = (data ?? [])
    .filter((s) => s.status !== ScheduleStatus.CANCELLED && !isScheduleRealized(s))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Agendamento' }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.list}
        data={schedules}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento futuro.</Text>}
        renderItem={({ item }) => {
          const statusColors = SCHEDULE_DERIVED_STATUS_COLORS[item.derivedStatus];
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/servicos/${item.id}` as never)}>
              <Text style={styles.client}>{item.clientName ?? '-'}</Text>
              <Text style={styles.meta}>{item.serviceTypeName ?? '-'}</Text>
              <Text style={styles.meta}>{formatPeriodo(item)}</Text>
              <View style={[styles.badge, { backgroundColor: statusColors.background }]}>
                <Text style={[styles.badgeText, { color: statusColors.text }]}>
                  {SCHEDULE_DERIVED_STATUS_LABELS_PT[item.derivedStatus]}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </>
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
      gap: 4,
    },
    client: { fontSize: 16, fontWeight: '700', color: colors.text },
    meta: { color: colors.textMuted, fontSize: 13 },
    badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
    badgeText: { fontSize: 12, fontWeight: '600' },
  });
}
