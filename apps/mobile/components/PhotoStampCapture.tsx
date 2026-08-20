import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

interface PhotoStampCaptureProps {
  uri: string;
  lines: string[];
  onCaptured: (stampedUri: string) => void;
  onError: () => void;
}

// Larguras maiores deixam o arquivo pesado sem ganho nenhum de legibilidade
// pro carimbo — 1280px de largura já é mais que suficiente pra impressão/
// PDF (mesmo espírito do quality:0.7-0.8 já usado nos outros uploads de
// foto do app).
const MAX_WIDTH = 1280;

// Renderiza a foto + uma barra semitransparente com data/hora/localização
// por cima (fora da tela, nunca visível pro usuário) e tira um "print" dessa
// composição via react-native-view-shot — assim o carimbo fica gravado nos
// pixels da imagem de verdade, aparecendo igual em qualquer lugar que a foto
// for usada depois (inclusive incorporada num PDF gerado, onde uma legenda
// só na tela do app não apareceria).
export function PhotoStampCapture({ uri, lines, onCaptured, onError }: PhotoStampCaptureProps) {
  const viewRef = useRef<View>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    Image.getSize(
      uri,
      (naturalWidth, naturalHeight) => {
        const scale = Math.min(1, MAX_WIDTH / naturalWidth);
        setSize({ width: naturalWidth * scale, height: naturalHeight * scale });
      },
      onError,
    );
  }, [uri]);

  useEffect(() => {
    if (!size || !imageLoaded) return;
    // Um tick pra garantir que a View já terminou de desenhar o frame antes
    // do captureRef ler os pixels (sem isso, às vezes sai um frame em branco).
    const timeout = setTimeout(async () => {
      try {
        const captured = await captureRef(viewRef, { format: 'jpg', quality: 0.85 });
        onCaptured(captured);
      } catch {
        onError();
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [size, imageLoaded]);

  if (!size) return null;

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={[styles.offscreen, { width: size.width, height: size.height }]}
    >
      <Image
        source={{ uri }}
        style={{ width: size.width, height: size.height }}
        onLoadEnd={() => setImageLoaded(true)}
      />
      <View style={styles.stampBar}>
        {lines.map((line, index) => (
          <Text key={index} style={styles.stampText}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Posicionado fora da área visível da tela (não opacity:0 — em alguns
  // aparelhos Android o captureRef devolve um bitmap em branco quando a
  // view tem opacidade zero) — ainda assim é desenhado de verdade pelo
  // sistema, só que onde ninguém vê.
  offscreen: { position: 'absolute', top: 0, left: -100000 },
  stampBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stampText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
