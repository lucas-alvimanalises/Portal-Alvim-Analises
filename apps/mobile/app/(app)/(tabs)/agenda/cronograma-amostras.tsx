import { useState } from 'react';
import { FlatList, Text, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { isScheduleRealized, ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { ColorPalette } from '../../../../lib/theme/palettes';
import { useThemeColors } from '../../../../lib/theme/ThemeContext';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface BreakdownItem {
  key: string;
  clientName: string;
  samplingPointName: string;
  quantity: number;
}

interface CompoundSummary {
  compoundId: string;
  code: string;
  name: string;
  total: number;
  breakdown: BreakdownItem[];
}

function isPending(schedule: ScheduleDto): boolean {
  return schedule.status !== ScheduleStatus.CANCELLED && !isScheduleRealized(schedule);
}

// Mesma lógica de apps/web/app/(portal)/agenda/cronograma-amostras/page.tsx
// — soma "Qtd. amostras" por composto entre os agendamentos ainda não
// realizados do mês, agregando todas as empresas/pontos.
function buildSummaries(schedules: ScheduleDto[], year: number, month: number): CompoundSummary[] {
  const byCompound = new Map<string, CompoundSummary>();

  for (const schedule of schedules) {
    if (!isPending(schedule)) continue;
    const d = new Date(schedule.scheduledDate);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month) continue;

    for (const point of schedule.samplingPoints) {
      for (const compound of point.compounds) {
        let summary = byCompound.get(compound.id);
        if (!summary) {
          summary = { compoundId: compound.id, code: compound.code, name: compound.name, total: 0, breakdown: [] };
          byCompound.set(compound.id, summary);
        }
        summary.total += compound.quantity;

        const breakdownKey = `${schedule.clientId}|${point.samplingPointId}`;
        let item = summary.breakdown.find((b) => b.key === breakdownKey);
        if (!item) {
          item = {
            key: breakdownKey,
            clientName: schedule.clientName ?? '-',
            samplingPointName: point.samplingPointName ?? '-',
            quantity: 0,
          };
          summary.breakdown.push(item);
        }
        item.quantity += compound.quantity;
      }
    }
  }

  return Array.from(byCompound.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((summary) => ({
      ...summary,
      breakdown: summary.breakdown.sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR')),
    }));
}

function CompoundCard({ summary }: { summary: CompoundSummary }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable style={styles.card} onPress={() => setExpanded((current) => !current)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.compoundLabel}>
            {summary.code} - {summary.name}
          </Text>
          <Text style={styles.total}>{summary.total}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.breakdown}>
          {summary.breakdown.map((item) => (
            <View key={item.key} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {item.clientName} <Text style={styles.breakdownPoint}>· {item.samplingPointName}</Text>
              </Text>
              <Text style={styles.breakdownQty}>{item.quantity}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default function CronogramaAmostrasScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { data, isLoading } = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });

  function changeMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }

  const summaries = data ? buildSummaries(data, cursor.year, cursor.month) : [];

  return (
    <>
      <Stack.Screen options={{ title: 'Cronograma de Amostras' }} />
      <View style={styles.nav}>
        <Pressable onPress={() => changeMonth(-1)}>
          <Text style={styles.navButton}>‹ Anterior</Text>
        </Pressable>
        <Text style={styles.navLabel}>
          {MONTH_LABELS[cursor.month]} de {cursor.year}
        </Text>
        <Pressable onPress={() => changeMonth(1)}>
          <Text style={styles.navButton}>Próximo ›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={styles.list}
          data={summaries}
          keyExtractor={(item) => item.compoundId}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma amostra prevista para este mês.</Text>}
          renderItem={({ item }) => <CompoundCard summary={item} />}
        />
      )}
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    nav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    navButton: { color: colors.primary, fontWeight: '600' },
    navLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    list: { padding: 16, gap: 12, backgroundColor: colors.bg },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    compoundLabel: { fontSize: 13, color: colors.textMuted },
    total: { fontSize: 28, fontWeight: '700', marginTop: 4, color: colors.text },
    chevron: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    breakdown: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    breakdownLabel: { fontSize: 13, color: colors.text, flex: 1 },
    breakdownPoint: { color: colors.textMuted },
    breakdownQty: { fontSize: 13, fontWeight: '700', color: colors.text },
  });
}
