import { Alert, Linking } from 'react-native';
import { ScheduleDto } from '@portal-alvim/shared';

// Botão "Como chegar" (Home e detalhe do serviço) — usa o endereço/link
// cadastrados na empresa (Client.address/mapsUrl, ver schedule.mapper.ts).
// Sem nenhum dos dois, o botão nem aparece (ver canOpenNavigation).
export function canOpenNavigation(schedule: Pick<ScheduleDto, 'clientAddress' | 'clientMapsUrl'>): boolean {
  return !!(schedule.clientMapsUrl || schedule.clientAddress);
}

// Google Maps: prioriza o link exato cadastrado no portal (pode apontar pra
// um portão/entrada específica, mais preciso que geocodificar o endereço de
// novo) — só cai pro endereço em texto se a empresa não tiver link salvo.
function googleMapsUrl(schedule: Pick<ScheduleDto, 'clientAddress' | 'clientMapsUrl'>): string | null {
  if (schedule.clientMapsUrl) return schedule.clientMapsUrl;
  if (schedule.clientAddress) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(schedule.clientAddress)}`;
  }
  return null;
}

// Waze não lê o mapsUrl (é um link do Google) — sempre a partir do endereço
// em texto, que o Waze também sabe geocodificar via "q=".
function wazeUrl(schedule: Pick<ScheduleDto, 'clientAddress' | 'clientMapsUrl'>): string | null {
  if (!schedule.clientAddress) return null;
  return `https://waze.com/ul?q=${encodeURIComponent(schedule.clientAddress)}&navigate=yes`;
}

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Não foi possível abrir', 'Verifique se o Google Maps ou o Waze está instalado.');
  }
}

// Pergunta qual app usar (pedido explícito do usuário — cada técnico usa o
// que preferir) e abre o link correspondente.
export function openNavigationChoice(schedule: Pick<ScheduleDto, 'clientAddress' | 'clientMapsUrl'>) {
  const maps = googleMapsUrl(schedule);
  const waze = wazeUrl(schedule);

  const buttons = [
    maps ? { text: 'Google Maps', onPress: () => openUrl(maps) } : null,
    waze ? { text: 'Waze', onPress: () => openUrl(waze) } : null,
    { text: 'Cancelar', style: 'cancel' as const },
  ].filter((b): b is NonNullable<typeof b> => b !== null);

  Alert.alert('Como chegar', 'Escolha o aplicativo de navegação:', buttons);
}
