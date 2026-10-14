// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/shared/theme-context';

// One decorative layer for both tabs and stack routes; never intercepts touches.
export function NeonNavigationGlow() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const progress = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  useEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    progress.stopAnimation();
    progress.setValue(1);
    if (!changed || reducedMotion) return;

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(1);
    };
  }, [pathname, progress, reducedMotion]);

  if (reducedMotion) return null;

  const accent = theme.colors.cyan;
  const transparent = `${accent}00`;
  return (
    <Animated.View
      testID="neon-navigation-glow"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.overlay, {
        opacity: progress.interpolate({
          inputRange: [0, 0.22, 0.6, 1],
          outputRange: [0, 0.65, 0.3, 0],
        }),
      }]}
    >
      <LinearGradient
        colors={[`${accent}55`, transparent]}
        style={styles.halo}
      />
      <LinearGradient
        colors={[`${accent}55`, transparent]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.leftEdge}
      />
      <LinearGradient
        colors={[transparent, `${accent}55`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.rightEdge}
      />
      <Animated.View style={[styles.beam, {
        width: width * 0.55,
        transform: [{ translateX: progress.interpolate({
          inputRange: [0, 1], outputRange: [-width * 0.55, width],
        }) }],
      }]}>
        <LinearGradient
          colors={[transparent, accent, '#FFFFFF', accent, transparent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, overflow: 'hidden' },
  halo: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  leftEdge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 24 },
  rightEdge: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 24 },
  beam: { position: 'absolute', top: 0, left: 0, height: 3 },
});
