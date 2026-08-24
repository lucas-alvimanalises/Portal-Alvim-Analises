import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Home, CalendarDays, ListChecks, User } from 'lucide-react-native';
import { typography } from '../../../lib/theme';
import { ColorPalette } from '../../../lib/theme/palettes';
import { useThemeColors } from '../../../lib/theme/ThemeContext';

// Tab bar persistente (ver handoff da tela inicial, seção 6) — Início leva
// à Home redesenhada; Agenda/Serviços abrem um hub simples reaproveitando
// as mesmas linhas já usadas na Home (sem inventar telas novas); Perfil é
// onde "Sair" mora agora (tirado do cabeçalho global).
function TabIcon(Icon: typeof Home, colors: ColorPalette) {
  return ({ focused }: { focused: boolean }) => (
    <Icon size={18} strokeWidth={2} color={focused ? colors.primary : colors.iconInactive} />
  );
}

function TabLabel(label: string, colors: ColorPalette) {
  return ({ focused }: { focused: boolean }) => (
    <Text
      style={{
        fontSize: typography.tabLabel.fontSize,
        fontWeight: focused ? '700' : '500',
        color: focused ? colors.primary : colors.textMuted,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 9,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { gap: 5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: TabIcon(Home, colors), tabBarLabel: TabLabel('Início', colors) }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          tabBarIcon: TabIcon(CalendarDays, colors),
          tabBarLabel: TabLabel('Agenda', colors),
        }}
      />
      <Tabs.Screen
        name="servicos"
        options={{
          tabBarIcon: TabIcon(ListChecks, colors),
          tabBarLabel: TabLabel('Serviços', colors),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          headerShown: true,
          title: 'Perfil',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          tabBarIcon: TabIcon(User, colors),
          tabBarLabel: TabLabel('Perfil', colors),
        }}
      />
    </Tabs>
  );
}
