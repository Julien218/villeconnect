// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Réseau lumineux reliant le C aux applications du Centre de Contrôle.
// Une impulsion voyage du centre vers chaque module en attente (notification / nouveau /
// urgence / erreur), matérialisant visuellement "toute la ville connectée autour de vous".
import { useEffect } from 'react';
import Svg, { Line, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Point { x: number; y: number; pulsing: boolean; color: string; }

export function NetworkLines({ width, height, cx, cy, points }: { width: number; height: number; cx: number; cy: number; points: Point[]; }) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {points.map((p, i) => (
        <Line
          key={`line-${i}`}
          x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(0,229,255,0.22)"
          strokeWidth={1.4}
        />
      ))}
      {points.filter(p => p.pulsing).map((p, i) => (
        <Pulse key={`pulse-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} color={p.color} delay={i * 260} />
      ))}
    </Svg>
  );
}

function Pulse({ x1, y1, x2, y2, color, delay }: { x1: number; y1: number; x2: number; y2: number; color: string; delay: number; }) {
  const t = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    cx: interpolate(t.value, [0, 1], [x1, x2]),
    cy: interpolate(t.value, [0, 1], [y1, y2]),
    opacity: interpolate(t.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
  }));

  return <AnimatedCircle r={4} fill={color} animatedProps={animatedProps} />;
}
