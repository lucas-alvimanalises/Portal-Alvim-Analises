import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { ROLE_LABELS_PT } from '@portal-alvim/shared';
import { useAuth } from '../../lib/auth/AuthContext';

// updateId/createdAt vêm do próprio expo-updates (só existem de verdade num
// build standalone, não no Expo Go) — mostrar aqui é a única forma de
// confirmar "qual versão do app é essa" sem precisar perguntar. Achado real:
// o app checa atualização sozinho ao abrir, mas baixa em segundo plano e só
// troca de bundle na PRÓXIMA abertura — sem nenhum aviso visível disso, um
// usuário que não fecha o app de verdade (só volta pra tela inicial) nunca
// percebe que ficou parado numa versão antiga. Este botão força o ciclo
// checar→baixar→aplicar na hora, sem depender de fechar/reabrir.
function formatUpdateInfo(): string {
  if (!Updates.isEmbeddedLaunch && !Updates.updateId) {
    return 'Desenvolvimento (sem atualização OTA aplicada)';
  }
  const id = Updates.updateId ? Updates.updateId.slice(0, 8) : 'embutida no APK';
  const date = Updates.createdAt ? new Date(Updates.createdAt).toLocaleString('pt-BR') : '-';
  return `${id} · ${date}`;
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  async function checkForUpdate() {
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert('Tudo certo', 'Você já está na versão mais recente do app.');
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'Atualização baixada',
        'O app vai reiniciar agora pra aplicar a versão mais recente.',
        [{ text: 'OK', onPress: () => Updates.reloadAsync() }],
      );
    } catch {
      Alert.alert(
        'Não foi possível verificar',
        'Confira sua conexão com a internet e tente de novo.',
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>{user ? ROLE_LABELS_PT[user.role] : ''}</Text>

      <View style={styles.updateBox}>
        <Text style={styles.updateLabel}>Versão do app</Text>
        <Text style={styles.updateValue}>{formatUpdateInfo()}</Text>
        <Pressable style={styles.updateButton} onPress={checkForUpdate} disabled={checking}>
          {checking ? (
            <ActivityIndicator color="#1f5f4d" />
          ) : (
            <Text style={styles.updateButtonText}>Verificar atualizações</Text>
          )}
        </Pressable>
      </View>

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
  updateBox: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    gap: 4,
  },
  updateLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  updateValue: { fontSize: 13, color: '#1f2937', marginBottom: 8 },
  updateButton: {
    borderWidth: 1,
    borderColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  updateButtonText: { color: '#1f5f4d', fontWeight: '600', fontSize: 13 },
});
