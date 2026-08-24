import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useServicosMenuItems } from '../../../../lib/useMenuItems';
import { MenuListCard } from '../../../../components/MenuListCard';
import { colors, spacing } from '../../../../lib/theme';

// Hub da aba "Serviços" — mesmas 3 linhas já mostradas na seção "Serviços"
// da Home (ver useServicosMenuItems), só que como tela própria pra quem
// entra direto por aqui em vez de pela Home.
export default function ServicosHubScreen() {
  const items = useServicosMenuItems();

  return (
    <>
      <Stack.Screen options={{ title: 'Serviços' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <MenuListCard items={items} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], backgroundColor: colors.bg, flexGrow: 1 },
});
