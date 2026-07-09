// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Le "C" vivant : cœur du Centre de Contrôle. Jamais statique :
// respiration, halo lumineux, rotation très lente, particules, impulsions de notification.
// Réutilisé à deux échelles : petit (barre de navigation) et grand (Centre de Contrôle).
// Rendu "cockpit smart city" : halo radial multi-couches (GlowOrb) + anneau de particules
// façon réseau de points connectés, dans l'ADN officiel (navy/bleu/cyan/teal).
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  Easing, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlowOrb } from './glow-orb';

interface Props {
  size?: number;
  pulsing?: boolean; // une notif en attente quelque part -> le C impulse plus fort
}

export function LivingC({ size = 56, pulsing = false }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme, size);

  const breathe = useSharedValue(0);
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    rotate.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false);
  }, []);

  useEffect(() => {
    if (pulsing) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 900, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0, { duration: 400 });
    }
  }, [pulsing]);

  const ambientStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathe.value, [0, 1], [0.94, 1.08]) * (1 + pulse.value * 0.14);
    const opacity = interpolate(breathe.value, [0, 1], [0.5, 0.85]) + pulse.value * 0.15;
    return { transform: [{ scale }], opacity };
  });

  const haloStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathe.value, [0, 1], [1, 1.12]) * (1 + pulse.value * 0.1);
    const opacity = interpolate(breathe.value, [0, 1], [0.55, 0.9]) + pulse.value * 0.2;
    return { transform: [{ scale }], opacity };
  });

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotate.value, [0, 1], [0, 360])}deg` }],
  }));

  const coreStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathe.value, [0, 1], [1, 1.035]);
    return { transform: [{ scale }] };
  });

  const ambientSize = size * 3.2;
  const haloSize = size * 2.1;

  return (
    <View style={[s.wrap, { width: ambientSize, height: ambientSize }]} pointerEvents="none">
      {/* Ambiance cockpit : large halo radial très diffus, façon lueur de smart city */}
      <Animated.View style={ambientStyle}>
        <GlowOrb size={ambientSize} color={theme.colors.electric} opacity={0.28} centerOpacity={0.22} />
      </Animated.View>
      {/* Halo resserré, plus intense, respire avec le C */}
      <Animated.View style={haloStyle}>
        <GlowOrb size={haloSize} color={theme.colors.cyan} opacity={0.55} centerOpacity={0.5} />
      </Animated.View>
      {/* Anneau tournant très lent (réseau de points connectés) */}
      <Animated.View style={[s.ring, ringStyle]}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View
            key={i}
            style={[
              s.particle,
              {
                transform: [
                  { rotate: `${i * 60}deg` },
                  { translateY: -(size * 1.02) },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Cœur du C */}
      <Animated.View style={[coreStyle]}>
        <LinearGradient
          colors={[theme.colors.electric, theme.colors.cyan]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.core, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Text style={[s.letter, { fontSize: size * 0.42 }]}>C</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

function makeStyles(theme: ThemeTokens, size: number) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: 1, height: 1, alignItems: 'center', justifyContent: 'center' },
    particle: {
      position: 'absolute', width: 4.5, height: 4.5, borderRadius: 2.5, backgroundColor: theme.colors.cyan,
      shadowColor: theme.colors.cyan, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    },
    core: {
      alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.colors.bgDeep,
      ...theme.shadow.glow,
    },
    letter: { color: '#fff', fontWeight: '900', fontFamily: theme.fonts.bold },
  });
}
