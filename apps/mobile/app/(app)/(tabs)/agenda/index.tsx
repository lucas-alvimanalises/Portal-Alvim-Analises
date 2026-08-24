import { ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useAgendaMenuItems } from '../../../../lib/useMenuItems';
import { MenuListCard } from '../../../../components/MenuListCard';
import { spacing } from '../../../../lib/theme';
import { useThemeColors } from '../../../../lib/theme/ThemeContext';

// Hub da aba "Agenda" — mesmas 3 linhas já mostradas na seção "Agenda" da
// Home (ver useAgendaMenuItems), só que como tela própria pra quem entra
// direto por aqui em vez de pela Home.
export default function AgendaHubScreen() {
  const items = useAgendaMenuItems();
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Agenda' }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing[5], backgroundColor: colors.bg, flexGrow: 1 }}
      >
        <MenuListCard items={items} />
      </ScrollView>
    </>
  );
}
