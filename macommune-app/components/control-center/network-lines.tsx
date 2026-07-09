// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Réseau lumineux reliant le C aux applications du Centre de Contrôle.
// Chaque lien est rendu en double trait (un trait large très diffus + un trait fin net) pour
// un effet "fibre lumineuse" façon cockpit smart city. Une impulsion voyage du centre vers
// chaque module en attente (notification / nouveau / urgence / erreur).
import { useEffect } from 'react';
import Svg, { Line, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Point { x: number; y: number; pulsing: boolean; color: string; }

export function NetworkLines({ width, height, cx, cy, points }: { width: number; height: number; cx: number; cy: number; points: Point[]; }) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <RadialGradient id="cc-ambient" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#0047FF" stopOpacity={0.16} />
          <Stop offset="100%" stopColor="#0047FF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Lueur d'ambiance derrière tout le réseau, centrée sur le C */}
      <Circle cx={cx} cy={cy} r={Math.max(width, height) * 0.42} fill="url(#cc-ambient)" />

      {points.map((p, i) => (
        <Line
          key={`glow-${i}`}
          x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(0,229,255,0.14)"
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
      {points.map((p, i) => (
        <Line
          key={`line-${i}`}
          x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(0,229,255,0.4)"
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

  return <AnimatedCircle r={4.2} fill={color} animatedProps={animatedProps} />;
}
