// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { LivingC } from './control-center/living-c';
import { GlowOrb } from './control-center/glow-orb';

const VISIBLE_TABS = ['index', 'community', 'messages', 'profile'] as const;
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  community: 'people',
  messages: 'chatbubble-ellipses',
  profile: 'person',
};
const LABELS: Record<string, string> = {
  index: 'Accueil',
  community: 'Citoyens',
  messages: 'Messages',
  profile: 'Profil',
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const visibleRoutes = VISIBLE_TABS
    .map(name => state.routes.find(route => route.name === name))
    .filter(Boolean) as BottomTabBarProps['state']['routes'];
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);
  const activeRoute = state.routes[state.index]?.name;

  function renderTab(route: BottomTabBarProps['state']['routes'][number]) {
    const focused = activeRoute === route.name;
    const label = LABELS[route.name] || route.name;
    return (
      <TouchableOpacity
        key={route.key}
        style={s.tabItem}
        activeOpacity={0.72}
        onPress={() => navigation.navigate(route.name as never)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
      >
        <Ionicons
          name={ICONS[route.name] || 'ellipse'}
          size={20}
          color={focused ? theme.colors.cyan : theme.colors.textMuted}
        />
        <Text style={[s.tabLabel, focused && s.tabLabelActive]}>{label}</Text>
        {focused ? <View style={s.activeLine} /> : null}
      </TouchableOpacity>
    );
  }

  const homeFocused = activeRoute === 'index';

  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.bar}>
        {leftRoutes.map(renderTab)}
        <View style={s.centerGap} />
        {rightRoutes.map(renderTab)}
      </View>

      <View style={s.centerFloating} pointerEvents="box-none">
        <GlowOrb
          size={126}
          color={theme.colors.cyan}
          opacity={homeFocused ? 0.74 : 0.55}
          centerOpacity={0.43}
          style={s.centerGlow}
        />
        <TouchableOpacity
          activeOpacity={0.84}
          style={[s.centerButtonRing, homeFocused && s.centerButtonActive]}
          onPress={() => navigation.navigate('index' as never)}
          accessibilityRole="button"
          accessibilityLabel="Retour à l’accueil"
          accessibilityState={{ selected: homeFocused }}
        >
          <LivingC size={48} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  const isDark = theme.mode === 'dark';
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '94%',
      marginBottom: 18,
      paddingHorizontal: 7,
      height: 72,
      backgroundColor: isDark ? 'rgba(7,19,41,0.95)' : 'rgba(255,255,255,0.95)',
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    tabItem: {
      flex: 1,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    centerGap: { width: 70 },
    tabLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.semibold,
    },
    tabLabelActive: { color: theme.colors.cyan },
    activeLine: {
      position: 'absolute',
      bottom: 3,
      width: 20,
      height: 2,
      borderRadius: 2,
      backgroundColor: theme.colors.cyan,
    },
    centerFloating: {
      position: 'absolute',
      bottom: 43,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerGlow: { left: -39, top: -39 },
    centerButtonRing: {
      minWidth: 58,
      minHeight: 58,
      borderRadius: 999,
      borderWidth: 1.4,
      borderColor: theme.colors.borderCyan,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.glow,
    },
    centerButtonActive: {
      borderColor: theme.colors.cyan,
      shadowOpacity: 0.85,
    },
  });
}
