import { Pressable, Text } from 'react-native';
import { useAuth } from '../lib/auth/AuthContext';
import { useThemeColors } from '../lib/theme/ThemeContext';

export function LogoutButton() {
  const { logout } = useAuth();
  const colors = useThemeColors();
  return (
    <Pressable onPress={logout} style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: colors.primary, fontWeight: '600' }}>Sair</Text>
    </Pressable>
  );
}
