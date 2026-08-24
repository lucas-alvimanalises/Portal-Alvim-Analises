import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FingerprintPattern } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBiometric } from '../lib/biometric/BiometricContext';
import { useAuth } from '../lib/auth/AuthContext';
import { ColorPalette } from '../lib/theme/palettes';
import { useThemeColors } from '../lib/theme/ThemeContext';

// Tela cheia mostrada por cima de tudo quando o app está trancado (login
// por biometria ativado, ver Perfil) — cold start e volta do segundo
// plano, ver BiometricContext.
export function BiometricLockScreen() {
  const { unlock } = useBiometric();
  const { logout } = useAuth();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState(false);

  async function handleUnlock() {
    setFailed(false);
    const success = await unlock();
    if (!success) setFailed(true);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <FingerprintPattern size={40} strokeWidth={1.5} color={colors.primary} />
        </View>
        <Text style={styles.title}>Portal Alvim Análises</Text>
        <Text style={styles.subtitle}>Confirme sua digital pra continuar</Text>
        {failed && (
          <Text style={styles.errorText}>Não foi possível confirmar. Tente de novo.</Text>
        )}
        <Pressable style={styles.button} onPress={handleUnlock}>
          <Text style={styles.buttonText}>Entrar com biometria</Text>
        </Pressable>
        <Pressable onPress={logout}>
          <Text style={styles.linkText}>Entrar com e-mail e senha</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
    errorText: { fontSize: 13, color: colors.danger, marginBottom: 8 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 32,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    linkText: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 20 },
  });
}
