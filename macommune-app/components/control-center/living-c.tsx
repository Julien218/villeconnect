// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Le "C" vivant : cœur du Centre de Contrôle. Jamais statique :
// respiration, halo lumineux, rotation très lente, particules, impulsions de notification.
// Réutilisé à deux échelles : petit (barre de navigation) et grand (Centre de Contrôle).
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  Easing, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';

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

  const haloStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathe.value, [0, 1], [1, 1.12]) * (1 + pulse.value * 0.1);
    const opacity = interpolate(breathe.value, [0, 1], [0.35, 0.65]) + pulse.value * 0.25;
    return { transform: [{ scale }], opacity };
  });

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotate.value, [0, 1], [0, 360])}deg` }],
  }));

  const coreStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathe.value, [0, 1], [1, 1.035]);
    return { transform: [{ scale }] };
  });

  return (
    <View style={[s.wrap, { width: size * 2.1, height: size * 2.1 }]} pointerEvents="none">
      {/* Halo lumineux respirant */}
      <Animated.View style={[s.halo, haloStyle]} />
      {/* Anneau tournant très lent (réseau) */}
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
    halo: {
      position: 'absolute', width: size * 1.9, height: size * 1.9, borderRadius: size,
      backgroundColor: theme.colors.cyan, opacity: 0.4,
    },
    ring: { position: 'absolute', width: 1, height: 1, alignItems: 'center', justifyContent: 'center' },
    particle: {
      position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.cyan,
      shadowColor: theme.colors.cyan, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
    },
    core: {
      alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.colors.bgDeep,
      ...theme.shadow.glow,
    },
    letter: { color: '#fff', fontWeight: '900', fontFamily: theme.fonts.bold },
  });
}
