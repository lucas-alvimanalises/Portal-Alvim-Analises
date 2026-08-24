import { Stack } from 'expo-router';
import { useThemeColors } from '../../../../lib/theme/ThemeContext';
import { LogoutButton } from '../../../../components/LogoutButton';

// Pilha da aba "Serviços" — cada tela já define o próprio título inline via
// <Stack.Screen options={{title}} />, então basta o headerRight padrão aqui
// (mesmo padrão do resto do app).
export default function ServicosTabLayout() {
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
