// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useRef, type PropsWithChildren } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import type { BottomTabNavigationOptions } from 'expo-router/build/react-navigation/bottom-tabs';

type BottomTabSceneStyleInterpolator = NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']>;

export const TRANSITION_DURATION = 300;
export const transitionEasing = Easing.out(Easing.cubic);

// Animate the navigator's progress, preserving mounted screens and scroll position.
export const futuristicTabTransition: BottomTabSceneStyleInterpolator = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1], outputRange: [0, 1, 0], extrapolate: 'clamp',
    }),
    transform: [
      { translateX: current.progress.interpolate({
        inputRange: [-1, 0, 1], outputRange: [-22, 0, 22], extrapolate: 'clamp',
      }) },
      { scale: current.progress.interpolate({
        inputRange: [-1, 0, 1], outputRange: [0.985, 1, 0.985], extrapolate: 'clamp',
      }) },
    ],
  },
});

// Native Stack handles its own transitions. Its web fallback needs a focus animation.
export function WebStackTransition({ children }: PropsWithChildren) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'web' || reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: TRANSITION_DURATION,
      easing: transitionEasing,
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(1);
    };
  }, [progress, reducedMotion]));

  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <Animated.View
      testID="stack-transition"
      style={[styles.scene, {
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1] }) },
        ],
      }]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ scene: { flex: 1, minHeight: 0 } });
