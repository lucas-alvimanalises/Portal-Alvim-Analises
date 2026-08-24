import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useAgendaMenuItems } from '../../../../lib/useMenuItems';
import { MenuListCard } from '../../../../components/MenuListCard';
import { colors, spacing } from '../../../../lib/theme';

// Hub da aba "Agenda" — mesmas 3 linhas já mostradas na seção "Agenda" da
// Home (ver useAgendaMenuItems), só que como tela própria pra quem entra
// direto por aqui em vez de pela Home.
export default function AgendaHubScreen() {
  const items = useAgendaMenuItems();

  return (
    <>
      <Stack.Screen options={{ title: 'Agenda' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <MenuListCard items={items} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], backgroundColor: colors.bg, flexGrow: 1 },
});
