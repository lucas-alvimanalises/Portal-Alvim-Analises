import { Stack } from 'expo-router';
import { LogoutButton } from '../../components/LogoutButton';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="index" options={{ title: 'Portal Alvim' }} />
      <Stack.Screen name="meus-agendamentos" options={{ title: 'Meus Agendamentos' }} />
      <Stack.Screen name="meus-servicos" options={{ title: 'Meus Serviços' }} />
      <Stack.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
