import { ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useServicosMenuItems } from '../../../../lib/useMenuItems';
import { MenuListCard } from '../../../../components/MenuListCard';
import { spacing } from '../../../../lib/theme';
import { useThemeColors } from '../../../../lib/theme/ThemeContext';

// Hub da aba "Serviços" — mesmas 3 linhas já mostradas na seção "Serviços"
// da Home (ver useServicosMenuItems), só que como tela própria pra quem
// entra direto por aqui em vez de pela Home.
export default function ServicosHubScreen() {
  const items = useServicosMenuItems();
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Serviços' }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing[5], backgroundColor: colors.bg, flexGrow: 1 }}
      >
        <MenuListCard items={items} />
      </ScrollView>
    </>
  );
}
