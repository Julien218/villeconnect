// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Raccourci hexagonal du Centre de Contrôle, avec ses 7 états visuels
// officiels : normal / notification / nouveau contenu / urgence / erreur / synchronisation / favori.
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { FavoriteItem } from '@/shared/control-center-types';

interface Props {
  item: FavoriteItem;
  size?: number;
  editMode?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onRemove?: () => void;
}

const STATE_COLOR: Record<string, string | null> = {
  normal: null,
  notification: null,
  new: '#00E5FF',
  urgent: '#F59E0B',
  error: '#F87171',
  syncing: '#0047FF',
  favorite: null,
};

export function HexFavorite({ item, size = 68, editMode = false, onPress, onLongPress, onRemove }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme, size);
  const moduleColor = theme.colors.modules[item.colorKey] ?? theme.colors.modules.commune;
  const haloColor = STATE_COLOR[item.state];

  const syncSpin = useSharedValue(0);
  useEffect(() => {
    if (item.state === 'syncing') {
      syncSpin.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    }
  }, [item.state]);
  const syncStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${syncSpin.value * 360}deg` }],
  }));

  const wobble = useSharedValue(0);
  useEffect(() => {
    if (editMode) {
      wobble.value = withRepeat(withTiming(1, { duration: 160, easing: Easing.linear }), -1, true);
    } else {
      wobble.value = withTiming(0, { duration: 120 });
    }
  }, [editMode]);
  const wobbleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(wobble.value - 0.5) * 3}deg` }],
  }));

  return (
    <Animated.View style={editMode ? wobbleStyle : undefined}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        style={[s.wrap, { width: size, height: size }]}
      >
        {haloColor && (
          <View style={[StyleSheet.absoluteFillObject, s.halo, { shadowColor: haloColor, borderColor: haloColor }]} />
        )}
        {item.state === 'syncing' && (
          <Animated.View style={[StyleSheet.absoluteFillObject, s.syncRing, syncStyle]} />
        )}
        <View style={[s.iconBubble, { backgroundColor: moduleColor.bg }]}>
          <Ionicons name={item.icon} size={size * 0.34} color={moduleColor.fg} />
        </View>

        {item.state === 'notification' && <View style={s.dot} />}
        {item.state === 'favorite' && (
          <Ionicons name="star" size={11} color={theme.colors.warning} style={s.star} />
        )}

        {editMode && (
          <TouchableOpacity style={s.removeBtn} onPress={onRemove} hitSlop={8}>
            <Ionicons name="close" size={11} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      <Text numberOfLines={1} style={s.label}>{item.label}</Text>
    </Animated.View>
  );
}

function makeStyles(theme: ThemeTokens, size: number) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center', justifyContent: 'center', borderRadius: size * 0.32,
      backgroundColor: theme.colors.surfaceSolid, borderWidth: 1.4, borderColor: theme.colors.borderCyan,
    },
    halo: {
      borderRadius: size * 0.32, borderWidth: 1.6, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    },
    syncRing: {
      borderRadius: size * 0.32, borderWidth: 2, borderColor: theme.colors.electric, borderStyle: 'dashed',
    },
    iconBubble: {
      width: size * 0.62, height: size * 0.62, borderRadius: size * 0.2, alignItems: 'center', justifyContent: 'center',
    },
    dot: {
      position: 'absolute', top: 6, right: 8, width: 8, height: 8, borderRadius: 4,
      backgroundColor: theme.colors.cyan, shadowColor: theme.colors.cyan, shadowOpacity: 1, shadowRadius: 4,
    },
    star: { position: 'absolute', bottom: 5, right: 7 },
    removeBtn: {
      position: 'absolute', top: -6, left: -6, width: 20, height: 20, borderRadius: 10,
      backgroundColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: theme.colors.bgDeep,
    },
    label: {
      marginTop: 6, fontSize: 10.5, fontWeight: '700', color: theme.colors.textSecondary,
      fontFamily: theme.fonts.semibold, textAlign: 'center', width: size + 20,
    },
  });
}
