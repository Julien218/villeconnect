// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Hub d'accueil : six modules en hexagones de part et d'autre du logo central (maquette officielle).
import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Polygon, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';

export interface HubItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string; // page de l'application
  url?: string; // lien officiel externe (https)
}

interface Props {
  items: readonly HubItem[]; // 6 éléments : colonne gauche (3) puis colonne droite (3)
  onPress: (item: HubItem) => void;
}

// Hexagone « pointe à gauche et à droite » dans un rectangle w × h.
function hexPoints(w: number, h: number): string {
  const inset = h * 0.28;
  return [
    `${inset},1`, `${w - inset},1`, `${w - 1},${h / 2}`,
    `${w - inset},${h - 1}`, `${inset},${h - 1}`, `1,${h / 2}`,
  ].join(' ');
}

export function HexHub({ items, onPress }: Props) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const s = makeStyles(theme);

  const width = Math.min(screenWidth, 560) - 32;
  const hexW = Math.round(width * 0.33);
  const hexH = Math.round(hexW * 0.78);
  const rowGap = Math.round(hexH * 0.1);
  const height = hexH * 3 + rowGap * 2;
  const orb = Math.round(width * 0.36);
  const left = items.slice(0, 3);
  const right = items.slice(3, 6);

  const renderHex = (item: HubItem, index: number, side: 'left' | 'right') => {
    // Les hexagones du milieu sont décalés vers l'extérieur, comme sur la maquette.
    const shift = index === 1 ? 0 : Math.round(hexW * 0.18);
    const style = {
      position: 'absolute' as const,
      top: index * (hexH + rowGap),
      width: hexW,
      height: hexH,
      ...(side === 'left' ? { left: shift - Math.round(hexW * 0.18) } : { right: shift - Math.round(hexW * 0.18) }),
    };
    return (
      <TouchableOpacity
        key={item.key}
        style={style}
        activeOpacity={0.8}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <Svg width={hexW} height={hexH} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id={`hex-${item.key}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={theme.colors.cyan} stopOpacity="0.9" />
              <Stop offset="1" stopColor={theme.colors.electric} stopOpacity="0.5" />
            </SvgGradient>
          </Defs>
          <Polygon
            points={hexPoints(hexW, hexH)}
            fill={theme.colors.surfaceSolid}
            stroke={`url(#hex-${item.key})`}
            strokeWidth={1.4}
          />
        </Svg>
        <View style={s.hexContent} pointerEvents="none">
          <Ionicons name={item.icon} size={Math.round(hexH * 0.32)} color={theme.colors.cyan} />
          <Text style={s.hexLabel} numberOfLines={1}>{item.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.wrap, { width, height }]}>
      <View
        style={[
          s.orb,
          { width: orb, height: orb, borderRadius: orb / 2, left: (width - orb) / 2, top: (height - orb) / 2 },
        ]}
        pointerEvents="none"
      >
        <Image source={require('@/assets/logo-official-small.png')} style={{ width: orb * 0.7, height: orb * 0.7 }} resizeMode="contain" />
      </View>
      {left.map((item, index) => renderHex(item, index, 'left'))}
      {right.map((item, index) => renderHex(item, index, 'right'))}
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrap: { alignSelf: 'center', marginVertical: 8 },
    orb: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.borderCyan,
      backgroundColor: theme.colors.cyanSoft,
    },
    hexContent: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 4 },
    hexLabel: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '800' },
  });
}
