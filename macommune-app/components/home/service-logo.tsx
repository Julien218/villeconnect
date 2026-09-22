// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Circle } from 'react-native-svg';

const artwork = {
  events: require('@/assets/service-logos/news.webp'),
  shops: require('@/assets/service-logos/shops.webp'),
  fuel: require('@/assets/service-logos/fuel.webp'),
  wallet: require('@/assets/service-logos/wallet.webp'),
  services: require('@/assets/service-logos/services.webp'),
  profile: require('@/assets/service-logos/profile.webp'),
};
export type ServiceLogoName = keyof typeof artwork | 'agenda' | 'login' | 'account';

/** Decorative only: the parent button supplies the accessible service name. */
export function ServiceLogo({ name }: { name: ServiceLogoName }) {
  const id = useId().replace(/:/g, '');
  if (name in artwork) {
    return (
      <View pointerEvents="none" accessible={false} style={s.logo}>
        <Image source={artwork[name as keyof typeof artwork]} resizeMode="contain" accessible={false} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />
      </View>
    );
  }

  // Matching C-shaped chrome and circuits for services absent from the supplied sheet.
  return (
    <View pointerEvents="none" accessible={false} style={s.logo}>
      <Svg width="100%" height="100%" viewBox="0 0 224 244" aria-hidden={true}>
        <Defs>
          <LinearGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#70F7FF" /><Stop offset="0.25" stopColor="#00AEFF" />
            <Stop offset="0.55" stopColor="#0753E7" /><Stop offset="0.8" stopColor="#002B74" /><Stop offset="1" stopColor="#00ECFF" />
          </LinearGradient>
          <LinearGradient id={`${id}face`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#157EC5" /><Stop offset="0.45" stopColor="#052849" /><Stop offset="1" stopColor="#010B1D" />
          </LinearGradient>
          <LinearGradient id={`${id}metal`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#B9FAFF" /><Stop offset="0.38" stopColor="#08DFFF" /><Stop offset="1" stopColor="#0873D9" />
          </LinearGradient>
        </Defs>
        <Ellipse cx="105" cy="203" rx="72" ry="22" fill="#008CFF" opacity="0.12" />
        <Path d="M166 38 C104 -18 20 26 18 120 C16 202 91 249 165 207 L156 190 C95 225 35 189 37 121 C39 48 99 5 153 53 Z" fill={`url(#${id}ring)`} stroke="#16DFFF" strokeWidth="1" />
        <Path d="M163 36 C93 -19 19 37 21 122" fill="none" stroke="#92FAFF" strokeWidth="1.5" />
        <G stroke="#00D5F2" strokeWidth="2" fill="none">
          <Path d="M142 91 H172 L185 78 H213 M144 111 H205 M145 133 H176 L187 143 H211 M142 155 H163 L177 169 H202" />
          <Circle cx="213" cy="78" r="4" /><Circle cx="205" cy="111" r="4" /><Circle cx="211" cy="143" r="4" /><Circle cx="202" cy="169" r="4" />
        </G>
        <Ellipse cx="119" cy="204" rx="59" ry="20" fill={`url(#${id}ring)`} stroke="#03BCED" />
        <Ellipse cx="126" cy="198" rx="46" ry="12" fill="#020C1B" stroke="#007ABE" />
        <Ellipse cx="104" cy="183" rx="42" ry="8" fill="#00C9FF" opacity="0.15" />
        {name === 'agenda' ? (
          <G>
            <Rect x="53" y="76" width="96" height="106" rx="12" fill="#001329" stroke="#0862B5" strokeWidth="5" />
            <Rect x="49" y="69" width="95" height="106" rx="11" fill={`url(#${id}face)`} stroke={`url(#${id}metal)`} strokeWidth="2.5" />
            <Path d="M50 100 H143" stroke="#1FDFFF" strokeWidth="3" />
            <Path d="M73 59 V83 M121 59 V83" stroke="#003775" strokeWidth="10" strokeLinecap="round" />
            <Path d="M71 58 V80 M119 58 V80" stroke={`url(#${id}metal)`} strokeWidth="6" strokeLinecap="round" />
            {[0, 1, 2].flatMap(row => [0, 1, 2].map(col => <Rect key={`${row}-${col}`} x={64 + col * 25} y={113 + row * 18} width="13" height="9" rx="2" fill={row === 1 && col === 1 ? '#FFFFFF' : '#00BCEB'} opacity={row === 1 && col === 1 ? 1 : 0.8} />))}
          </G>
        ) : (
          <G>
            <Path d="M72 111 V91 C72 49 126 49 126 91 V111" fill="none" stroke="#00416C" strokeWidth="16" />
            <Path d="M69 108 V87 C69 49 122 49 122 87 V108" fill="none" stroke={`url(#${id}metal)`} strokeWidth="11" />
            <Rect x="55" y="107" width="91" height="74" rx="13" fill="#00224B" stroke="#0057A8" strokeWidth="3" />
            <Rect x="51" y="102" width="90" height="74" rx="12" fill={`url(#${id}face)`} stroke={`url(#${id}metal)`} strokeWidth="2" />
            <Path d="M94 121 L113 129 V143 Q109 155 94 161 Q79 155 75 143 V129 Z" fill="#034073" stroke="#00DFFF" strokeWidth="2" />
            <Path d="M84 140 L91 147 L104 132" fill="none" stroke="#88F5FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </G>
        )}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({ logo: { width: '100%', maxWidth: 100, aspectRatio: 224 / 244 } });
