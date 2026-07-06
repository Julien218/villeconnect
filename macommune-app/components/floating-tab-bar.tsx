// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Bottom navigation flottante arrondie avec bouton central VilleConnect — direction "Smart City Premium".
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '@/shared/theme';

const ICONS: Record<string, any> = {
  index: 'home',
  events: 'search',
  wallet: 'wallet',
  shops: 'storefront',
  fuel: 'flame',
};

const LABELS: Record<string, string> = {
  index: 'Accueil',
  events: 'Recherche',
  wallet: 'Wallet',
  shops: 'Commerces',
  fuel: 'Carburant',
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  // On isole une route centrale factice pour le bouton "C" (accès rapide à l'accueil / hub).
  const routes = state.routes;
  const mid = Math.floor(routes.length / 2);

  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.bar}>
        {routes.map((route, i) => {
          if (i === mid) {
            return (
              <View key={route.key} style={s.centerSlot}>
                <TouchableOpacity
                  style={s.centerBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('index' as never)}
                >
                  <LinearGradient
                    colors={[theme.colors.electric, theme.colors.cyan]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.centerGrad}
                  >
                    <Text style={s.centerLetter}>C</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            );
          }
          const focused = state.index === i;
          const label = LABELS[route.name] ?? route.name;
          return (
            <TouchableOpacity
              key={route.key}
              style={s.tabItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(route.name as never)}
            >
              <Ionicons name={ICONS[route.name] ?? 'ellipse'} size={21} color={focused ? theme.colors.cyan : theme.colors.textMuted} />
              <Text style={[s.tabLabel, focused && { color: theme.colors.cyan }]}>{label}</Text>
              {route.name === 'wallet' && (
                <View style={s.badge}><Text style={s.badgeText}>3</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:        { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar:         {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '92%', marginBottom: 18, paddingHorizontal: 10, height: 68,
    backgroundColor: 'rgba(16,24,48,0.92)', borderRadius: theme.radius.xl,
    borderWidth: 1, borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  tabItem:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel:    { fontSize: 9.5, fontWeight: '700', color: theme.colors.textMuted },
  badge:       { position: 'absolute', top: -2, right: '28%', backgroundColor: theme.colors.danger, borderRadius: 8, minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:   { color: '#fff', fontSize: 9, fontWeight: '800' },
  centerSlot:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtn:   { marginTop: -32 },
  centerGrad:  { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.colors.bgDeep, ...theme.shadow.glow },
  centerLetter:{ color: '#fff', fontSize: 22, fontWeight: '900' },
});
