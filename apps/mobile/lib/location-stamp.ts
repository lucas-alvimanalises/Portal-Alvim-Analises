import * as Location from 'expo-location';

export interface StampLocation {
  latitude: number;
  longitude: number;
  // Endereço aproximado (melhor esforço via geocodificação reversa do
  // próprio SO) — null quando não deu pra resolver (sem sinal de internet,
  // área rural sem base de endereços, etc.). As coordenadas acima são o
  // dado que realmente prova onde a foto foi tirada; o endereço é só uma
  // legenda a mais quando disponível.
  address: string | null;
}

// Pega a localização atual pra carimbar na foto — GPS puro (sem precisar de
// internet), com timeout curto pra não travar o técnico esperando um sinal
// fraco dentro de uma planta industrial. Retorna null se a permissão foi
// negada ou o GPS não respondeu a tempo — quem chama decide se ainda assim
// segue com a foto (só data/hora) em vez de bloquear o registro.
export async function getCurrentStampLocation(): Promise<StampLocation | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);
    if (!position) return null;

    const { latitude, longitude } = position.coords;

    let address: string | null = null;
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = results[0];
      if (first) {
        address = [first.street, first.city, first.region].filter(Boolean).join(', ');
      }
    } catch {
      // Sem internet ou geocodificação indisponível — segue só com coordenadas.
    }

    return { latitude, longitude, address };
  } catch {
    return null;
  }
}

export function formatStampText(location: StampLocation | null): string[] {
  const now = new Date();
  const lines = [
    now.toLocaleDateString('pt-BR'),
    now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  ];
  if (location) {
    lines.push(`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    if (location.address) lines.push(location.address);
  } else {
    lines.push('Localização indisponível');
  }
  return lines;
}
