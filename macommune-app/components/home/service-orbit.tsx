// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Image, StyleSheet, Text, View } from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { NeonPulseButton } from '@/components/neon-pulse-button';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

const HEX_PATH = 'M30 3 H76 Q84 3 88 12 L103 36 Q107 44 103 52 L88 76 Q84 85 76 85 H30 Q22 85 18 76 L3 52 Q-1 44 3 36 L18 12 Q22 3 30 3Z';

export const HOME_SERVICES = [
  { label: 'Actualités', icon: 'newspaper-outline', color: '#00BFFF', route: '/events' },
  { label: 'Agenda', icon: 'calendar-outline', color: '#168BFF', route: '/events' },
  { label: 'Signalement', icon: 'warning-outline', color: '#B064F5', route: null },
  { label: 'E-guichet', icon: 'document-text-outline', color: '#00C8C8', route: '/services' },
  { label: 'Annuaire', icon: 'people-outline', color: '#008FFF', route: '/shops' },
  { label: 'Travaux', icon: 'construct-outline', color: '#00DAC7', route: '/services' },
] as const;

export function ServiceOrbit({ width, onService, onCenter }: {
  width: number;
  onService: (service: typeof HOME_SERVICES[number]) => void;
  onCenter: () => void;
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
      <NeonPulseButton testID="central-logo-button" accessibilityRole="button" accessibilityLabel="Ouvrir tous les services" onPress={onCenter}
        activeOpacity={0.95} style={{ position: 'absolute', left: 111 * k, top: 17 * k, width: 215 * k, height: 242 * k }}>
        <Image source={require('@/assets/night-orbit.webp')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </NeonPulseButton>
      {HOME_SERVICES.map((item, index) => {
        const row = Math.floor(index / 2);
        const offset = row === 0 ? 10 : row === 1 ? -4 : 26;
        return (
          <TouchableOpacity neonSurface={false} key={item.label} accessibilityRole="button" accessibilityLabel={item.label}
            onPress={() => onService(item)} activeOpacity={0.7}
            style={[s.hex, { width: 106 * k, height: 88 * k, top: (row * 91 + 1) * k,
              ...(index % 2 === 0 ? { left: offset * k } : { right: offset * k }),
              shadowColor: item.color }]}>
            <Svg pointerEvents="none" width="100%" height="100%" viewBox="-3 0 112 96" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={`hex-${index}`} x1="0" y1="0" x2="0.7" y2="1">
                  <Stop offset="0" stopColor="#245475" /><Stop offset="0.28" stopColor="#0C263F" />
                  <Stop offset="0.52" stopColor="#081623" /><Stop offset="1" stopColor="#030A13" />
                </LinearGradient>
                <LinearGradient id={`edge-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={item.color} /><Stop offset="1" stopColor="#03101E" />
                </LinearGradient>
              </Defs>
              <Path d={HEX_PATH} transform="translate(0 6)" fill={`url(#edge-${index})`} stroke={item.color} strokeOpacity="0.6" strokeWidth="1.5" />
              <Path d={HEX_PATH} fill="none" stroke={item.color} strokeOpacity="0.14" strokeWidth="5" />
              <Path d={HEX_PATH} fill={`url(#hex-${index})`} stroke={item.color} strokeWidth="1.4" />
              <Path d={HEX_PATH} transform="translate(4 3) scale(0.925)" fill="none" stroke={item.color} strokeOpacity="0.25" strokeWidth="0.8" />
              <Path d="M5 34 L20 12 Q24 5 31 5 H75 Q82 5 86 12" fill="none" stroke="#C3F3FF" strokeOpacity="0.65" strokeWidth="1.2" />
              <Path d="M20 76 Q24 84 31 84 H75 Q82 84 86 76" fill="none" stroke={item.color} strokeOpacity="0.85" strokeWidth="2" />
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
