import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Switch } from 'react-native';
import * as Updates from 'expo-updates';
import { ROLE_LABELS_PT } from '@portal-alvim/shared';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTheme } from '../../../lib/theme/ThemeContext';

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
  const { scheme, colors, toggleTheme } = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>{user?.email}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {user ? ROLE_LABELS_PT[user.role] : ''}
      </Text>

      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.themeRow}>
          <Text style={[styles.boxLabel, { color: colors.textMuted }]}>Modo escuro</Text>
          <Switch
            value={scheme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.boxLabel, { color: colors.textMuted }]}>Versão do app</Text>
        <Text style={[styles.updateValue, { color: colors.text }]}>{formatUpdateInfo()}</Text>
        <Pressable
          style={[styles.updateButton, { borderColor: colors.primary }]}
          onPress={checkForUpdate}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.updateButtonText, { color: colors.primary }]}>
              Verificar atualizações
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable style={[styles.button, { backgroundColor: colors.danger }]} onPress={logout}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  name: { fontSize: 20, fontWeight: '700' },
  meta: { marginTop: 4 },
  button: {
    marginTop: 24,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  box: {
    marginTop: 24,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxLabel: { fontSize: 12, fontWeight: '600' },
  updateValue: { fontSize: 13, marginBottom: 8 },
  updateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  updateButtonText: { fontWeight: '600', fontSize: 13 },
});
