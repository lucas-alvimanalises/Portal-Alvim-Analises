import { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { radii, shadow, spacing } from '../lib/theme';
import { ColorPalette } from '../lib/theme/palettes';
import { useThemeColors } from '../lib/theme/ThemeContext';

// lucide-react-native não exporta um tipo público pro componente de ícone em
// si, e o tipo real (ForwardRefExoticComponent com propTypes do react-native-
// svg) não bate estruturalmente com uma interface de props explícita — `any`
// aqui é o mesmo compromisso comum em libs de ícone de terceiros.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = ComponentType<any>;

export interface MenuRowItem {
  key: string;
  icon: IconComponent;
  title: string;
  subtitle: string;
  badge?: { text: string; color: string; background: string };
  onPress: () => void;
}

// Card único com linhas separadas por borda (sem borda na última) — usado
// tanto na Home (seções "Serviços"/"Agenda") quanto nos hubs das próprias
// abas Agenda/Serviços (mesmo conteúdo, dois lugares de acesso). Ver
// handoff da tela inicial, seções 3 e 4.
export function MenuListCard({ items }: { items: MenuRowItem[] }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <MenuRow
          key={item.key}
          item={item}
          isLast={index === items.length - 1}
          colors={colors}
          styles={styles}
        />
      ))}
    </View>
  );
}

function MenuRow({
  item,
  isLast,
  colors,
  styles,
}: {
  item: MenuRowItem;
  isLast: boolean;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.iconSquare}>
        <Icon size={17} strokeWidth={2} color={colors.primary} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      {item.badge && (
        <View style={[styles.badge, { backgroundColor: item.badge.background }]}>
          <Text style={[styles.badgeText, { color: item.badge.color }]}>{item.badge.text}</Text>
        </View>
      )}
      <ChevronRight size={17} strokeWidth={2} color={colors.iconInactive} />
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      overflow: 'hidden',
      ...shadow,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      paddingVertical: 14,
      paddingHorizontal: 15,
      minHeight: 62,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowPressed: { backgroundColor: colors.surfaceMuted },
    iconSquare: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: { flex: 1, gap: 2, minWidth: 0 },
    title: { fontSize: 14, fontWeight: '600', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted },
    badge: {
      paddingHorizontal: spacing[2],
      paddingVertical: 3,
      borderRadius: radii.pill,
    },
    badgeText: { fontSize: 12, fontWeight: '600' },
  });
}
