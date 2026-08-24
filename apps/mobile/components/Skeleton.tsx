import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Easing } from 'react-native';
import { radii } from '../lib/theme';
import { useThemeColors } from '../lib/theme/ThemeContext';

// Placeholder de carregamento com pulso de opacidade — mesmo espírito do
// `.skeleton` do portal web (nunca texto "Carregando..."), ver handoff da
// tela inicial: "usar skeletons... nos badges e nos contadores".
export function Skeleton({
  width,
  height,
  borderRadius = radii.sm,
}: {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
}) {
  const colors = useThemeColors();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: colors.skeleton, opacity }}
    />
  );
}
