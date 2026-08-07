import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ROLE_LABELS_PT } from '@portal-alvim/shared';
import { useAuth } from '../../lib/auth/AuthContext';

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>{user ? ROLE_LABELS_PT[user.role] : ''}</Text>

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f6f8' },
  name: { fontSize: 20, fontWeight: '700' },
  meta: { color: '#6b7280', marginTop: 4 },
  button: {
    marginTop: 24,
    backgroundColor: '#b3261e',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
