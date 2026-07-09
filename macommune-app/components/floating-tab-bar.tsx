// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Bottom navigation flottante — le "C" vivant flotte au-dessus de la barre, entre les onglets,
// cœur du Centre de Contrôle VilleConnect OS : appui simple = Centre de Contrôle immersif,
// appui long (500ms) = menu radial premium. Les onglets classiques (dont Accueil) restent
// une navigation discrète en dessous, comme prévu par la maquette officielle.
//
// Instrumentation [CC] : logs sur ouverture/fermeture des deux overlays + garde défensive
// pour ne jamais avoir Control Center et Quick Menu visibles en même temps (edge case
// double-tap rapide).
import { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { LivingC } from './control-center/living-c';
import { GlowOrb } from './control-center/glow-orb';
import { ControlCenterModal } from './control-center/control-center-modal';
import { RadialQuickMenu } from './control-center/radial-quick-menu';
import { RadialAction } from '@/shared/control-center-types';

const ICONS: Record<string, any> = {
  index: 'home',
  events: 'search',
  wallet: 'wallet',
  shops: 'storefront',
  fuel: 'flame',
  profile: 'person-circle',
};

const LABELS: Record<string, string> = {
  index: 'Accueil',
  events: 'Recherche',
  wallet: 'Wallet',
  shops: 'Commerces',
  fuel: 'Carburant',
  profile: 'Profil',
};

function logCC(msg: string, extra?: Record<string, unknown>) {
  console.log(`[CC] ${msg}`, extra ?? '');
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const s = makeStyles(theme);
  const routes = state.routes;
  const mid = Math.ceil(routes.length / 2);

  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [cOrigin, setCOrigin] = useState({ x: 0, y: 0 });
  const centerRef = useRef<View>(null);

  function openControlCenter() {
    logCC('C tap -> open Control Center');
    // Garde défensive : jamais les deux overlays visibles en même temps.
    setQuickMenuOpen(false);
    setControlCenterOpen(true);
  }

  function closeControlCenter() {
    logCC('Control Center -> closed by tab bar');
    setControlCenterOpen(false);
  }

  function measureAndOpenQuickMenu() {
    logCC('C long-press -> open Quick Menu');
    centerRef.current?.measureInWindow((x, y, w, h) => {
      setCOrigin({ x: x + w / 2, y: y + h / 2 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Garde défensive symétrique.
      setControlCenterOpen(false);
      setQuickMenuOpen(true);
    });
  }

  function closeQuickMenu() {
    logCC('Quick Menu -> closed');
    setQuickMenuOpen(false);
  }

  function handleRadialAction(action: RadialAction) {
    logCC('Quick Menu action selected', { key: action.key });
    switch (action.key) {
      case 'add-event': router.push('/(tabs)/events' as any); break;
      case 'search-shop': router.push('/(tabs)/shops' as any); break;
      case 'settings': router.push('/(tabs)/profile' as any); break;
      case 'favorites': setControlCenterOpen(true); break;
      case 'ia': Alert.alert('Assistant IA', 'Votre compagnon VilleConnect arrive très bientôt ici.'); break;
      case 'report': Alert.alert('Signalement', 'Le formulaire de signalement arrive très bientôt ici.'); break;
      case 'scan': Alert.alert('Scanner', 'Le scanner QR Code arrive très bientôt ici.'); break;
    }
  }

  function renderTab(route: BottomTabBarProps['state']['routes'][number]) {
    const routeIndex = state.routes.findIndex(r => r.key === route.key);
    const focused = state.index === routeIndex;
    const label = LABELS[route.name] ?? route.name;
    return (
      <TouchableOpacity
        key={route.key}
        style={s.tabItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(route.name as never)}
      >
        <Ionicons name={ICONS[route.name] ?? 'ellipse'} size={19} color={focused ? theme.colors.cyan : theme.colors.textMuted} />
        <Text style={[s.tabLabel, focused && { color: theme.colors.cyan }]}>{label}</Text>
        {route.name === 'wallet' && (
          <View style={s.badge}><Text style={s.badgeText}>3</Text></View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.bar}>
        {routes.slice(0, mid).map(renderTab)}
        <View style={s.centerGap} />
        {routes.slice(mid).map(renderTab)}
      </View>

      {/* Le C flotte au-dessus de la barre, toujours visible, jamais un onglet comme les autres.
          Halo radial renforcé (GlowOrb) pour un rendu "cockpit smart city" premium. */}
      <View style={s.centerFloating} pointerEvents="box-none">
        <GlowOrb size={128} color={theme.colors.cyan} opacity={0.6} centerOpacity={0.45} style={s.centerGlow} />
        <View ref={centerRef} collapsable={false} style={s.centerButtonRing}>
          <TouchableOpacity
            activeOpacity={0.85}
            delayLongPress={500}
            onPress={openControlCenter}
            onLongPress={measureAndOpenQuickMenu}
          >
            <LivingC size={46} />
          </TouchableOpacity>
        </View>
      </View>

      <ControlCenterModal visible={controlCenterOpen} onClose={closeControlCenter} />
      <RadialQuickMenu
        visible={quickMenuOpen}
        originX={cOrigin.x}
        originY={cOrigin.y}
        onClose={closeQuickMenu}
        onSelect={handleRadialAction}
      />
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  const isDark = theme.mode === 'dark';
  return StyleSheet.create({
    wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
    bar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      width: '94%', marginBottom: 18, paddingHorizontal: 6, height: 68,
      backgroundColor: isDark ? 'rgba(16,24,48,0.92)' : 'rgba(255,255,255,0.92)',
      borderRadius: theme.radius.xl,
      borderWidth: 1, borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    centerGap: { width: 46 },
    tabLabel: { fontSize: 8.3, fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.semibold },
    badge: { position: 'absolute', top: -2, right: '22%', backgroundColor: theme.colors.danger, borderRadius: 8, minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
    centerFloating: { position: 'absolute', bottom: 46, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
    centerGlow: { left: -64 + 23, top: -64 + 23 },
    centerButtonRing: {
      borderRadius: 999, borderWidth: 1.4, borderColor: theme.colors.borderCyan,
      ...theme.shadow.glow,
    },
  });
}
