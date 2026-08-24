import { Redirect, Stack } from 'expo-router';
import { Role } from '@portal-alvim/shared';
import { useAuth } from '../../lib/auth/AuthContext';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { LogoutButton } from '../../components/LogoutButton';

// Cliente nunca vê a tab bar/menu operacional — vai direto pra tela única
// dele (Meus Serviços). Decidido aqui, antes de montar o grupo (tabs), pra
// não piscar a tab bar pra um perfil que não deve vê-la (ver handoff da
// tela inicial: "Cliente continua na tela única 'Meus Serviços'").
export default function AppLayout() {
  const { user } = useAuth();
  const colors = useThemeColors();

  if (user?.role === Role.CLIENT) {
    return <Redirect href="/meus-servicos" />;
  }

  return (
    <Stack
      screenOptions={{
        headerRight: () => <LogoutButton />,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* Cada tela dentro de (tabs) define o próprio cabeçalho (a Home tem
          um customizado; as demais usam o header nativo do Stack aninhado
          de cada aba) — aqui só decide se a tab bar aparece ou não. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="meus-servicos" options={{ title: 'Meus Serviços' }} />
      <Stack.Screen name="cadeia-custodia/[extractionId]" options={{ title: 'Cadeia de Custódia' }} />
      <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
    </Stack>
  );
}
