import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, CalendarDays, ListChecks, User } from 'lucide-react-native';
import { colors, typography } from '../../../lib/theme';

// Tab bar persistente (ver handoff da tela inicial, seção 6) — Início leva
// à Home redesenhada; Agenda/Serviços abrem um hub simples reaproveitando
// as mesmas linhas já usadas na Home (sem inventar telas novas); Perfil é
// onde "Sair" mora agora (tirado do cabeçalho global).
function TabIcon(Icon: typeof Home) {
  return ({ focused }: { focused: boolean }) => (
    <Icon size={18} strokeWidth={2} color={focused ? colors.primary : colors.iconInactive} />
  );
}

function TabLabel(label: string) {
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 9,
        },
        tabBarItemStyle: { gap: 5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: TabIcon(Home), tabBarLabel: TabLabel('Início') }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ tabBarIcon: TabIcon(CalendarDays), tabBarLabel: TabLabel('Agenda') }}
      />
      <Tabs.Screen
        name="servicos"
        options={{ tabBarIcon: TabIcon(ListChecks), tabBarLabel: TabLabel('Serviços') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ headerShown: true, title: 'Perfil', tabBarIcon: TabIcon(User), tabBarLabel: TabLabel('Perfil') }}
      />
    </Tabs>
  );
}
