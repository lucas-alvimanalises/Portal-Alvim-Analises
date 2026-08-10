import { Stack } from 'expo-router';
import { LogoutButton } from '../../components/LogoutButton';

// Telas de Serviços/Agenda (servicos/*, agenda/*) definem o próprio título
// inline via <Stack.Screen options={{ title }} /> — não precisam de entrada
// aqui (mesmo padrão do expo-router pra rotas dinâmicas/aninhadas).
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="index" options={{ title: 'Portal Alvim' }} />
      <Stack.Screen name="meus-servicos" options={{ title: 'Meus Serviços' }} />
      <Stack.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
