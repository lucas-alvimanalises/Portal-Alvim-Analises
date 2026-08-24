import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth/AuthContext';
import { ThemeProvider, useTheme } from '../lib/theme/ThemeContext';
import { BiometricProvider, useBiometric } from '../lib/biometric/BiometricContext';
import { BiometricLockScreen } from '../components/BiometricLockScreen';

const queryClient = new QueryClient();

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const { settingsLoaded, locked } = useBiometric();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  // Trancado por biometria (ver BiometricContext): cobre a tela toda em vez
  // do Stack normal, até confirmar a digital. Só depois de settingsLoaded
  // pra nunca piscar a Home antes de saber se devia estar trancado.
  if (user && settingsLoaded && locked) {
    return <BiometricLockScreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

// Ícones da status bar precisam da cor oposta ao fundo do tema (claros
// sobre fundo escuro, escuros sobre fundo claro) — por isso segue o nosso
// `scheme` (escolha do usuário/sistema, ver ThemeContext), não "auto" (que
// seguiria só a aparência do SO, ignorando um toggle manual).
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BiometricProvider>
            <RootNavigation />
            <ThemedStatusBar />
          </BiometricProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
