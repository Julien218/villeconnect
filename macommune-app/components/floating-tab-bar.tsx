// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { Image, View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { FeatureNotice } from './home/feature-notice';

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const k = Math.min(width, 473) / 473;
  const s = makeStyles(k);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const activeRoute = state.routes[state.index]?.name;
  const tabs = [
    { label: 'Accueil', icon: 'home-outline', active: activeRoute === 'index', action: () => navigation.navigate('index') },
    { label: 'Citoyens', icon: 'people-outline', active: false, action: () => router.push('/services') },
    { label: 'Messages', icon: 'chatbox-ellipses-outline', active: false, action: () => setMessagesOpen(true) },
    { label: 'Profil', icon: 'person-outline', active: activeRoute === 'profile', action: () => navigation.navigate('profile') },
  ];
  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.bar}>
        {tabs.map((tab, index) => (
          <View key={tab.label} style={[s.slot, index === 1 && { marginRight: 74 * k }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: tab.active }} onPress={tab.action} style={s.tab} activeOpacity={0.7}>
              <Ionicons name={tab.icon as any} size={22} color={tab.active ? '#00BFFF' : '#92A2B9'} />
              <Text style={[s.label, tab.active && s.active]}>{tab.label}</Text>
              {tab.active && <View style={s.line} />}
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mon portefeuille CivicLoop" accessibilityState={{ selected: activeRoute === 'wallet' }} onPress={() => navigation.navigate('wallet')} activeOpacity={0.85} style={s.center}>
          <View style={s.innerRing}><Image source={require('@/assets/night-mark.webp')} style={s.logo} resizeMode="contain" /></View>
        </TouchableOpacity>
      </View>
      <FeatureNotice notice={messagesOpen ? { title: 'Votre messagerie citoyenne', text: 'Cet espace fait partie du visuel de votre future application. La messagerie n’est pas encore connectée : aucun message ne peut être envoyé pour le moment.' } : null} onClose={() => setMessagesOpen(false)} />
    </View>
  );
}
const makeStyles = (k: number) => StyleSheet.create({
  wrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 14 * k, paddingTop: 18 * k, backgroundColor: 'rgba(2,7,13,0.92)' },
  bar: { width: '95%', maxWidth: 449, height: 73 * k, borderRadius: 40, borderWidth: 1, borderColor: '#122D43', backgroundColor: '#07121F', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 20 },
  slot: { flex: 1 },
  tab: { height: 61 * k, alignItems: 'center', justifyContent: 'center', gap: 7 },
  label: { color: '#98A5BA', fontSize: 10, fontWeight: '400' },
  active: { color: '#00BFFF' },
  line: { position: 'absolute', bottom: 1, width: 14, height: 1, backgroundColor: '#00BFFF' },
  center: { position: 'absolute', left: '50%', marginLeft: -40 * k, top: -18 * k, width: 80 * k, height: 83 * k, borderRadius: 45, borderColor: '#008FFF', borderWidth: 2, backgroundColor: '#021021', alignItems: 'center', justifyContent: 'center', shadowColor: '#007AFF', shadowOpacity: 1, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } },
  innerRing: { width: 68 * k, height: 71 * k, borderRadius: 38, borderWidth: 1, borderColor: '#00D5F7', alignItems: 'center', justifyContent: 'center', backgroundColor: '#001126' },
  logo: { width: 61 * k, height: 63 * k },
});
