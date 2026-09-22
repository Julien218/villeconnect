// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useId, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, type TouchableOpacityProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/shared/theme-context';
import { NeonTouchableOpacity } from './neon-button';

/** A single light pulse on contact, without a rectangular surface or delayed navigation. */
export function NeonPulseButton({ children, onPressIn, disabled, ...props }: TouchableOpacityProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const id = useId().replace(/:/g, '');
  const color = theme.colors.cyan;

  const reset = useCallback(() => {
    animation.current?.stop();
    progress.setValue(1);
  }, [progress]);
  // No lingering pulse when leaving or returning to the screen.
  useFocusEffect(useCallback(() => reset, [reset]));

  return (
    <NeonTouchableOpacity
      {...props}
      disabled={disabled}
      neonSurface={false}
      onPressIn={event => {
        reset();
        if (!disabled && !reducedMotion) {
          progress.setValue(0);
          animation.current = Animated.timing(progress, {
            toValue: 1,
            duration: 460,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          });
          animation.current.start();
        }
        onPressIn?.(event);
      }}
    >
      {children}
      {!reducedMotion && !disabled && (
        <Animated.View
          testID="logo-press-pulse"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={[StyleSheet.absoluteFill, {
            opacity: progress.interpolate({ inputRange: [0, 0.2, 0.55, 1], outputRange: [0, 0.85, 0.4, 0] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] }) }],
          }]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 110" aria-hidden>
            <Defs>
              <RadialGradient id={`${id}halo`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={color} stopOpacity="0" />
                <Stop offset="0.58" stopColor={color} stopOpacity="0.08" />
                <Stop offset="0.8" stopColor={color} stopOpacity="0.45" />
                <Stop offset="1" stopColor={color} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="52" rx="48" ry="50" fill={`url(#${id}halo)`} />
            <Path d="M77 19 A39 43 0 1 0 77 85" fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.15" strokeLinecap="round" />
            <Path d="M77 19 A39 43 0 1 0 77 85" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </Animated.View>
      )}
    </NeonTouchableOpacity>
  );
}
