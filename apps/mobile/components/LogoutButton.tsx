import { Pressable, Text } from 'react-native';
import { useAuth } from '../lib/auth/AuthContext';

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={logout} style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: '#1f5f4d', fontWeight: '600' }}>Sair</Text>
    </Pressable>
  );
}
