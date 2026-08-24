import { useState } from 'react';
import { FlatList, Text, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { isScheduleRealized, ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../../lib/api/schedules.api';
import { ColorPalette } from '../../../../../lib/theme/palettes';
import { useThemeColors } from '../../../../../lib/theme/ThemeContext';

function formatPeriodo(schedule: ScheduleDto): string {
  if (schedule.dateConfirmed) {
    return new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  return new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
}

function ScheduleRow({ schedule, onPress }: { schedule: ScheduleDto; onPress: () => void }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View>
        <Text style={styles.client}>{schedule.clientName ?? '-'}</Text>
        <Text style={styles.meta}>{schedule.serviceTypeName ?? '-'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.meta}>{formatPeriodo(schedule)}</Text>
        <Text style={styles.meta}>{schedule.technicians.map((t) => t.name).join(', ') || 'Sem técnico definido'}</Text>
      </View>
    </Pressable>
  );
}

// Espelha /agenda/organizar-servico do portal web: escolher um serviço pra
// ver o que precisa ser levado a campo (pontos/compostos), baixar a cadeia
// de custódia em branco e preencher o check list — ver [id].tsx. Só
// impressão de etiqueta Zebra continua exclusiva do portal web.
export default function OrganizarServicoListScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [showPrevious, setShowPrevious] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });

  const active = (data ?? []).filter((s) => s.status !== ScheduleStatus.CANCELLED);
  const upcoming = active
    .filter((s) => !isScheduleRealized(s))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const previous = active
    .filter((s) => isScheduleRealized(s))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const visible = showPrevious ? [...upcoming, ...previous] : upcoming;

  return (
    <>
      <Stack.Screen options={{ title: 'Organizar Serviço' }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.list}
        data={visible}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum serviço agendado.</Text>}
        renderItem={({ item }) => (
          <ScheduleRow schedule={item} onPress={() => router.push(`/agenda/organizar-servico/${item.id}` as never)} />
        )}
        ListFooterComponent={
          previous.length > 0 ? (
            <Pressable onPress={() => setShowPrevious((current) => !current)} style={styles.toggle}>
              <Text style={styles.toggleText}>
                Serviços Anteriores ({previous.length}) {showPrevious ? '▲' : '▼'}
              </Text>
            </Pressable>
          ) : null
        }
      />
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    list: { padding: 16, gap: 8, backgroundColor: colors.bg },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    client: { fontSize: 15, fontWeight: '700', color: colors.text },
    meta: { color: colors.textMuted, fontSize: 12 },
    toggle: { alignItems: 'center', paddingVertical: 12 },
    toggleText: { color: colors.primary, fontWeight: '600' },
  });
}
