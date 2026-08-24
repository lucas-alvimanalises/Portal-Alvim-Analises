import { Stack } from 'expo-router';
import { useThemeColors } from '../../../../lib/theme/ThemeContext';
import { LogoutButton } from '../../../../components/LogoutButton';

// Pilha da aba "Agenda" — cada tela (incluindo as de organizar-servico/*)
// já define o próprio título inline via <Stack.Screen options={{title}} />,
// então basta o headerRight padrão aqui (mesmo padrão do resto do app).
export default function AgendaTabLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerRight: () => <LogoutButton />,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
