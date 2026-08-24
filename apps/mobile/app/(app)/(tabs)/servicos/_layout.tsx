import { Stack } from 'expo-router';
import { LogoutButton } from '../../../../components/LogoutButton';

// Pilha da aba "Serviços" — cada tela já define o próprio título inline via
// <Stack.Screen options={{title}} />, então basta o headerRight padrão aqui
// (mesmo padrão do resto do app).
export default function ServicosTabLayout() {
  return <Stack screenOptions={{ headerRight: () => <LogoutButton /> }} />;
}
