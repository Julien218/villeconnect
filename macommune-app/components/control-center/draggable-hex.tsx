// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Wrapper glisser-déposer pour un hexagone du Centre de Contrôle.
// Actif uniquement en mode personnalisation (editMode) — sinon transparent, aucun coût perf.
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Props {
  x: number;
  y: number;
  size: number;
  editMode: boolean;
  onDropAt: (absX: number, absY: number) => void;
  children: React.ReactNode;
}

export function DraggableHex({ x, y, size, editMode, onDropAt, children }: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .enabled(editMode)
    .onStart(() => {
      scale.value = withSpring(1.14);
      runOnJS(Haptics.selectionAsync)();
    })
    .onUpdate(e => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      const finalX = x + size / 2 + tx.value;
      const finalY = y + size / 2 + ty.value;
      runOnJS(onDropAt)(finalX, finalY);
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      scale.value = withSpring(1);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: scale.value > 1 ? 50 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, alignItems: 'center' }, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
