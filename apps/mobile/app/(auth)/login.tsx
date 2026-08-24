import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth/AuthContext';
import { ColorPalette } from '../../lib/theme/palettes';
import { useThemeColors } from '../../lib/theme/ThemeContext';

// require() em vez de import — padrão do Metro bundler pra imagens estáticas
// (React Native/Expo não tem declaração de tipo pra módulos .jpg por
// padrão, diferente do Next.js no portal web).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../../assets/logo.jpg');

export default function LoginScreen() {
  const { login } = useAuth();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Portal Alvim Análises</Text>
      <Text style={styles.subtitle}>Entre com suas credenciais.</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
    logo: { width: '100%', height: 140, alignSelf: 'center', marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 24, textAlign: 'center' },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: { color: '#fff', fontWeight: '600' },
    error: { color: colors.danger, marginBottom: 12 },
  });
}
