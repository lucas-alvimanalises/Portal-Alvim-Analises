import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { biometricStorage } from './storage';
import { useAuth } from '../auth/AuthContext';

interface BiometricContextValue {
  // true assim que a preferência salva já foi lida do storage — evita
  // decidir "trancado ou não" antes de saber a escolha real do usuário.
  settingsLoaded: boolean;
  enabled: boolean;
  // Hardware com biometria cadastrada no aparelho — sem isso o toggle em
  // Perfil fica desabilitado (nada pra usar). Sempre false no web (sem
  // implementação nativa lá).
  isSupported: boolean;
  // Pede confirmação da digital/rosto ANTES de persistir a escolha —
  // liga só se o teste der certo (evita ativar e a pessoa nunca mais
  // conseguir entrar por engano de configuração).
  setEnabled: (value: boolean) => Promise<boolean>;
  locked: boolean;
  unlock: () => Promise<boolean>;
}

const BiometricContext = createContext<BiometricContextValue | undefined>(undefined);

export function BiometricProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      const [storedEnabled, hasHardware, isEnrolled] = await Promise.all([
        biometricStorage.isEnabled(),
        Platform.OS === 'web' ? Promise.resolve(false) : LocalAuthentication.hasHardwareAsync(),
        Platform.OS === 'web' ? Promise.resolve(false) : LocalAuthentication.isEnrolledAsync(),
      ]);
      setIsSupported(hasHardware && isEnrolled);
      setEnabledState(storedEnabled && hasHardware && isEnrolled);
      setSettingsLoaded(true);
    })();
  }, []);

  // Tranca de novo ao voltar do segundo plano (ex.: trocou de app e voltou)
  // — mesmo comportamento de apps bancários. Só existe sessão pra trancar
  // quando já tem usuário logado (ver Home/RootLayout).
  useEffect(() => {
    if (!enabled || !user) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        setLocked(true);
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [enabled, user]);

  // Trava uma vez só, na primeira vez que tiver usuário logado + preferência
  // carregada (cobre tanto abrir o app já com sessão salva quanto logar
  // agora mesmo) — via ref pra não repetir depois: sem essa guarda, LIGAR o
  // toggle mais abaixo já dispararia esse mesmo efeito de novo (enabled
  // muda) e trancaria a tela na hora, pedindo uma segunda confirmação
  // logo depois da primeira (a que já confirma o próprio ato de ativar).
  const hasCheckedInitialLock = useRef(false);
  useEffect(() => {
    if (!settingsLoaded || !user || hasCheckedInitialLock.current) return;
    hasCheckedInitialLock.current = true;
    if (enabled) setLocked(true);
  }, [settingsLoaded, user, enabled]);

  async function setEnabled(value: boolean): Promise<boolean> {
    if (!value) {
      await biometricStorage.setEnabled(false);
      setEnabledState(false);
      return true;
    }
    if (!isSupported) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirme sua digital pra ativar o login por biometria',
    });
    if (!result.success) return false;
    await biometricStorage.setEnabled(true);
    setEnabledState(true);
    return true;
  }

  async function unlock(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirme sua identidade pra entrar',
    });
    if (result.success) {
      setLocked(false);
      return true;
    }
    return false;
  }

  return (
    <BiometricContext.Provider
      value={{ settingsLoaded, enabled, isSupported, setEnabled, locked, unlock }}
    >
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometric(): BiometricContextValue {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric deve ser usado dentro de um BiometricProvider.');
  }
  return context;
}
