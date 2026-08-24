import { ReactNode, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronRight } from 'lucide-react-native';
import { Role, ScheduleDto } from '@portal-alvim/shared';
import { useAuth } from '../../../lib/auth/AuthContext';
import { schedulesApi } from '../../../lib/api/schedules.api';
import { samplesApi } from '../../../lib/api/samples.api';
import { radii, shadow, spacing } from '../../../lib/theme';
import { ColorPalette } from '../../../lib/theme/palettes';
import { useThemeColors } from '../../../lib/theme/ThemeContext';
import { getFirstName, getGreeting, getInitials } from '../../../lib/format';
import {
  formatScheduleDatePill,
  formatScheduleSubtitle,
  getNextSchedule,
  getUpcomingConfirmedSchedules,
} from '../../../lib/home-summary';
import { useAgendaMenuItems, useServicosMenuItems } from '../../../lib/useMenuItems';
import { MenuListCard } from '../../../components/MenuListCard';
import { Skeleton } from '../../../components/Skeleton';

// Tela inicial (Admin/Gestor/Técnico) — ver handoff de design em
// "Tela inicial do aplicativo Alvim/design_handoff_app_home/README.md".
// Substitui a lista textual plana anterior por: cabeçalho com identidade do
// usuário, card de "Próximo serviço", os comandos reais do app agrupados em
// Serviços/Agenda, um bloco "Ação necessária" e a tab bar (ver
// (tabs)/_layout.tsx). Cliente nunca chega aqui — barrado em (app)/_layout.tsx.
export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isAdmin = user?.role === Role.ADMIN;

  const schedulesQuery = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });
  const pendingCertificatesQuery = useQuery({
    queryKey: ['pending-certificates'],
    queryFn: samplesApi.listPendingCertificates,
  });
  const servicosItems = useServicosMenuItems();
  const agendaItems = useAgendaMenuItems();

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['schedules'] }),
      queryClient.invalidateQueries({ queryKey: ['tracking-shipments'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-certificates'] }),
    ]);
    setRefreshing(false);
  }

  const schedules = schedulesQuery.data;
  const nextSchedule = schedules ? getNextSchedule(schedules) : undefined;
  const pendingCertificatesCount = pendingCertificatesQuery.data?.length;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const upcomingSchedules = schedules ? getUpcomingConfirmedSchedules(schedules) : [];

  return (
    <View style={styles.screen}>
      <Header
        name={user?.name ?? ''}
        insetTop={insets.top}
        onPressBell={() =>
          Alert.alert('Notificações', 'Central de notificações em breve.')
        }
        onPressAvatar={() => router.push('/perfil' as never)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {isAdmin ? (
          <Section label="Próximos Serviços">
            <UpcomingSchedulesCarousel
              loading={schedulesQuery.isLoading}
              isError={schedulesQuery.isError}
              onRetry={() => schedulesQuery.refetch()}
              schedules={upcomingSchedules}
              onOpenService={(id) => router.push(`/servicos/${id}` as never)}
              onOrganize={(id) => router.push(`/agenda/organizar-servico/${id}` as never)}
            />
          </Section>
        ) : (
          <NextScheduleCard
            loading={schedulesQuery.isLoading}
            isError={schedulesQuery.isError}
            onRetry={() => schedulesQuery.refetch()}
            schedule={nextSchedule}
            onOpenService={(id) => router.push(`/servicos/${id}` as never)}
            onOrganize={(id) => router.push(`/agenda/organizar-servico/${id}` as never)}
          />
        )}

        <Section label="Serviços">
          <MenuListCard items={servicosItems} />
        </Section>

        <Section label="Agenda">
          <MenuListCard items={agendaItems} />
        </Section>

        {(pendingCertificatesCount === undefined || pendingCertificatesCount > 0) && (
          <Section label="Ação necessária">
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/servicos/certificados-pendentes' as never)}
            >
              <View style={styles.actionDot} />
              <View style={styles.textBlock}>
                {pendingCertificatesCount === undefined ? (
                  <>
                    <Skeleton width={160} height={14} />
                    <Skeleton width={200} height={12} />
                  </>
                ) : (
                  <>
                    <Text style={styles.rowTitle}>
                      {pendingCertificatesCount}{' '}
                      {pendingCertificatesCount === 1 ? 'certificado pendente' : 'certificados pendentes'}
                    </Text>
                    <Text style={styles.rowSubtitle}>Amostras sem certificado de laboratório</Text>
                  </>
                )}
              </View>
              <ChevronRight size={17} strokeWidth={2} color={colors.iconInactive} />
            </Pressable>
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

function Header({
  name,
  insetTop,
  onPressBell,
  onPressAvatar,
}: {
  name: string;
  insetTop: number;
  onPressBell: () => void;
  onPressAvatar: () => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={[styles.header, { paddingTop: insetTop + 6 }]}>
      <View style={styles.headerText}>
        <Text style={styles.greeting}>
          {getGreeting()}
          {name ? `, ${getFirstName(name)}` : ''}
        </Text>
        <Text style={styles.brand}>Alvim Análises</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          onPress={onPressBell}
          style={({ pressed }) => [styles.bellButton, pressed && styles.bellButtonPressed]}
        >
          <Bell size={15} strokeWidth={2} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={onPressAvatar} style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function NextScheduleCard({
  loading,
  isError,
  onRetry,
  schedule,
  onOpenService,
  onOrganize,
}: {
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  schedule: ReturnType<typeof getNextSchedule> | null | undefined;
  onOpenService: (id: string) => void;
  onOrganize: (id: string) => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.nextCard}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="70%" height={18} />
        <Skeleton width="90%" height={14} />
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Skeleton width="100%" height={38} borderRadius={radii.sm} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.nextCard}>
        <Text style={styles.rowSubtitle}>Não foi possível carregar o próximo serviço.</Text>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  if (!schedule) {
    return (
      <View style={styles.nextCard}>
        <Text style={styles.rowSubtitle}>Nenhum serviço agendado para hoje.</Text>
      </View>
    );
  }

  return (
    <ScheduleSummaryCard
      schedule={schedule}
      showLabel
      onOpenService={onOpenService}
      onOrganize={onOrganize}
    />
  );
}

// Visual do card populado — extraído do NextScheduleCard (perfil não-Admin,
// serviço único) pra ser reaproveitado também dentro do carrossel por
// técnico do Admin (ver TechnicianSchedulesCarousel), sem duplicar estilo.
function ScheduleSummaryCard({
  schedule,
  showLabel,
  onOpenService,
  onOrganize,
}: {
  schedule: ScheduleDto;
  showLabel: boolean;
  onOpenService: (id: string) => void;
  onOrganize: (id: string) => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.nextCard}>
      <View style={styles.nextCardTop}>
        {showLabel && <Text style={styles.sectionLabel}>Próximo serviço</Text>}
        <View style={[styles.datePill, !showLabel && { marginLeft: 'auto' }]}>
          <Text style={styles.datePillText}>{formatScheduleDatePill(schedule)}</Text>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.nextCardTitle}>
          {schedule.clientName ?? '-'} — {schedule.serviceTypeName ?? '-'}
        </Text>
        <Text style={styles.rowSubtitle}>{formatScheduleSubtitle(schedule)}</Text>
      </View>
      <View style={styles.nextCardActions}>
        <Pressable
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
          onPress={() => onOpenService(schedule.id)}
        >
          <Text style={styles.primaryActionText}>Abrir serviço</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
          onPress={() => onOrganize(schedule.id)}
        >
          <Text style={styles.secondaryActionText}>Organizar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Visão do Admin: um carrossel único com os próximos serviços de todos os
// técnicos, em ordem de data mais próxima — arrastar pro lado mostra o
// compromisso seguinte, seja de quem for (pedido do usuário). Só serviços
// com data já confirmada (ver getUpcomingConfirmedSchedules).
function UpcomingSchedulesCarousel({
  loading,
  isError,
  onRetry,
  schedules,
  onOpenService,
  onOrganize,
}: {
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  schedules: ScheduleDto[];
  onOpenService: (id: string) => void;
  onOrganize: (id: string) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - spacing[5] * 2;
  const [activePage, setActivePage] = useState(0);
  const colors = useThemeColors();
  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.nextCard}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="70%" height={18} />
        <Skeleton width="90%" height={14} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.nextCard}>
        <Text style={styles.rowSubtitle}>Não foi possível carregar os próximos serviços.</Text>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  if (schedules.length === 0) {
    return (
      <View style={styles.nextCard}>
        <Text style={styles.rowSubtitle}>Nenhum serviço agendado.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing[2] }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setActivePage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))
        }
      >
        {schedules.map((schedule) => (
          <View key={schedule.id} style={{ width: cardWidth }}>
            <ScheduleSummaryCard
              schedule={schedule}
              showLabel={false}
              onOpenService={onOpenService}
              onOrganize={onOrganize}
            />
          </View>
        ))}
      </ScrollView>
      {schedules.length > 1 && (
        <View style={styles.dotsRow}>
          {schedules.map((_, index) => (
            <View key={index} style={[styles.dot, index === activePage && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface,
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerText: { gap: 2, flexShrink: 1, minWidth: 0 },
  greeting: { fontSize: 13, color: colors.textMuted },
  brand: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexShrink: 0 },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellButtonPressed: { backgroundColor: colors.surfaceMuted },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  content: { padding: spacing[4], paddingHorizontal: spacing[5], paddingBottom: 104, gap: spacing[5] },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nextCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing[4],
    gap: spacing[3],
    ...shadow,
  },
  nextCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  datePill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  datePillText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  nextCardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  nextCardActions: { flexDirection: 'row', gap: spacing[2] },
  primaryAction: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryActionPressed: { backgroundColor: colors.primaryPressed },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryActionPressed: { backgroundColor: colors.surfaceMuted },
  secondaryActionText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing[3],
  },
  retryButtonText: { fontSize: 13, fontWeight: '600', color: colors.text },
  actionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    ...shadow,
  },
  actionCardPressed: { backgroundColor: colors.surfaceMuted },
  actionDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.danger },
  textBlock: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: 13, color: colors.textMuted },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: radii.pill, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  });
}
