import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationDto } from '@portal-alvim/shared';
import { notificationsApi } from '../../lib/api/notifications.api';
import { radii, spacing } from '../../lib/theme';
import { ColorPalette } from '../../lib/theme/palettes';
import { useThemeColors } from '../../lib/theme/ThemeContext';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

// Lista das notificações do próprio usuário (sino da Home) — sem e-mail/
// push nesta fase, só dentro do app (ver NotificationsService no backend).
export default function NotificacoesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  function handlePress(item: NotificationDto) {
    if (!item.read) markReadMutation.mutate(item.id);
    if (item.link) router.push(item.link as never);
  }

  const hasUnread = (data ?? []).some((n) => !n.read);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notificações',
          headerRight: hasUnread
            ? () => (
                <Pressable onPress={() => markAllReadMutation.mutate()} style={{ paddingHorizontal: 12 }}>
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                    Marcar todas como lidas
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.list}
        data={data}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma notificação ainda.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              !item.read && styles.cardUnread,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handlePress(item)}
          >
            {!item.read && <View style={styles.unreadDot} />}
            <View style={styles.cardText}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
      />
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    list: { padding: spacing[4], gap: spacing[2] },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing[4],
      marginBottom: spacing[2],
    },
    cardUnread: { borderColor: colors.primary },
    cardPressed: { backgroundColor: colors.surfaceMuted },
    unreadDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.primary, marginTop: 5 },
    cardText: { flex: 1, gap: 2 },
    message: { fontSize: 14, color: colors.text },
    date: { fontSize: 12, color: colors.textMuted },
  });
}
