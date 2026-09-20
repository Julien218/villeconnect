// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

export const HOME_SERVICES = [
  { label: 'Actualités', icon: 'newspaper-outline', color: '#00BFFF', route: '/events' },
  { label: 'Agenda', icon: 'calendar-outline', color: '#168BFF', route: '/events' },
  { label: 'Signalement', icon: 'warning-outline', color: '#B064F5', route: null },
  { label: 'E-guichet', icon: 'document-text-outline', color: '#00C8C8', route: '/services' },
  { label: 'Annuaire', icon: 'people-outline', color: '#008FFF', route: '/shops' },
  { label: 'Travaux', icon: 'construct-outline', color: '#00DAC7', route: '/services' },
] as const;

export function ServiceOrbit({ width, onService, onWallet }: {
  width: number;
  onService: (service: typeof HOME_SERVICES[number]) => void;
  onWallet: () => void;
}) {
  const k = width / 437;
  return (
    <View style={{ height: 278 * k, width }}>
      <Svg width={width} height={278 * k} viewBox="0 0 437 278" style={StyleSheet.absoluteFill}>
        <Path d="M85 42 H116 L149 70 M352 42 H322 L289 70 M79 136 H140 M359 136 H298 M97 231 H131 L156 208 M340 231 H309 L283 208" stroke="#0075AB" strokeWidth="1" fill="none" />
        {[ [116,42], [322,42], [111,136], [326,136], [131,231], [309,231] ].map(([cx,cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#00DEFF" />
        ))}
      </Svg>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ouvrir le Wallet CivicLoop" onPress={onWallet}
        activeOpacity={0.85} style={{ position: 'absolute', left: 111 * k, top: 17 * k, width: 215 * k, height: 242 * k }}>
        <Image source={require('@/assets/night-orbit.webp')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </TouchableOpacity>
      {HOME_SERVICES.map((item, index) => {
        const row = Math.floor(index / 2);
        const offset = row === 0 ? 10 : row === 1 ? -4 : 26;
        return (
          <TouchableOpacity key={item.label} accessibilityRole="button" accessibilityLabel={item.label}
            onPress={() => onService(item)} activeOpacity={0.7}
            style={[s.hex, { width: 106 * k, height: 88 * k, top: (row * 91 + 1) * k,
              ...(index % 2 === 0 ? { left: offset * k } : { right: offset * k }),
              shadowColor: item.color }]}>
            <Svg width="100%" height="100%" viewBox="0 0 106 88" style={StyleSheet.absoluteFill}>
              <Defs><LinearGradient id={`hex-${index}`} x1="0" y1="0" x2="0.7" y2="1"><Stop offset="0" stopColor="#0A2136" /><Stop offset="0.55" stopColor="#040D17" /><Stop offset="1" stopColor="#02080E" /></LinearGradient></Defs>
              <Path d="M30 3 H76 Q84 3 88 12 L103 36 Q107 44 103 52 L88 76 Q84 85 76 85 H30 Q22 85 18 76 L3 52 Q-1 44 3 36 L18 12 Q22 3 30 3Z" stroke={item.color} strokeOpacity="0.8" strokeWidth="0.7" fill={`url(#hex-${index})`} />
            </Svg>
            {item.label === 'Travaux' ? (
              <View style={{ width: 28 * k, height: 28 * k }}><Svg width="100%" height="100%" viewBox="0 0 28 28"><Path d="M10 5 Q14 -1 18 5 L22 23 H6 Z M9 10 Q14 14 19 10 M7 17 Q14 21 21 17 M5 23 H23 Q27 23 26 26 H2 Q1 23 5 23" fill="none" stroke="#C7E8FB" strokeWidth="1.3" strokeLinejoin="round" /></Svg></View>
            ) : <Ionicons name={item.icon} size={28 * k} color={index === 2 ? '#CCA1FF' : '#C7E8FB'} />}
            <Text style={[s.label, { fontSize: 12 * k }]}>{item.label}</Text>
            <View style={[s.underline, { backgroundColor: item.color }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  hex: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 6, shadowOpacity: 0.32, shadowRadius: 13, shadowOffset: { width: 0, height: 0 } },
  label: { color: '#F5F7FC', fontWeight: '500' },
  underline: { height: 2, width: 18, borderRadius: 2, marginTop: 2 },
});
