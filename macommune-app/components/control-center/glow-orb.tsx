// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Halo radial réutilisable (SVG RadialGradient) pour l'ambiance "cockpit
// smart city" du C vivant et du Centre de Contrôle. Purement décoratif, aucune interaction,
// aucun impact sur le logo officiel verrouillé (celui-ci reste intact ailleurs dans l'app).
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

interface Props {
  size: number;
  color: string; // couleur hex ADN (ex: theme.colors.cyan) — pas de rgba() ici
  opacity?: number;
  centerOpacity?: number;
  style?: any;
}

export function GlowOrb({ size, color, opacity = 0.5, centerOpacity = 0.55, style }: Props) {
  const id = `glow-${color.replace('#', '')}-${Math.round(size)}`;
  return (
    <Svg width={size} height={size} style={[{ position: 'absolute' }, style]} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={centerOpacity} />
          <Stop offset="55%" stopColor={color} stopOpacity={opacity * 0.6} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}
