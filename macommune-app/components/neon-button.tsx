// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Shared visual treatment only: original handlers, roles and disabled states stay intact.
import { forwardRef, useState } from 'react';
import {
  Pressable, TouchableOpacity, StyleSheet, View,
  type PressableProps, type TouchableOpacityProps, type ViewStyle, type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/shared/theme-context';

type NeonOptions = {
  neonColor?: string;
  /** SVG/image buttons supply their own shaped bevel instead of a rectangular surface. */
  neonSurface?: boolean;
};

function useNeon(neonColor?: string) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  return {
    color: neonColor || theme.colors.cyan,
    dark: theme.mode === 'dark',
    reducedMotion,
  };
}

function relief(style: StyleProp<ViewStyle>, color: string, dark: boolean, pressed: boolean, disabled: boolean, surface: boolean, reducedMotion: boolean): StyleProp<ViewStyle> {
  const flat = StyleSheet.flatten(style) || {};
  const transforms = Array.isArray(flat.transform) ? flat.transform : [];
  return [
    surface && { borderRadius: 14 },
    style,
    surface && {
      boxShadow: disabled
        ? '0 1px 0 rgba(0,0,0,0.2)'
        : [
          { offsetX: 0, offsetY: pressed ? 1 : 5, blurRadius: 0, color: dark ? '#010710' : '#B8C6D7' },
          { offsetX: 0, offsetY: pressed ? 2 : 8, blurRadius: pressed ? 5 : 14, color: dark ? '#00000088' : '#152F4B25' },
          { offsetX: 0, offsetY: 0, blurRadius: pressed ? 6 : 13, color: `${color}${dark ? '40' : '25'}` },
        ],
    },
    disabled && { opacity: flat.opacity ?? 0.45 },
    pressed && !disabled && !reducedMotion && {
      transform: [...transforms, { translateY: 2 }, { scale: 0.98 }],
    },
  ];
}

function NeonBevel({ style, color, disabled, pressed }: {
  style: StyleProp<ViewStyle>; color: string; disabled: boolean; pressed: boolean;
}) {
  const radius = StyleSheet.flatten(style)?.borderRadius ?? 14;
  return (
    <LinearGradient
      pointerEvents="none"
      accessible={false}
      colors={pressed
        ? ['rgba(0,0,0,0.10)', 'transparent', 'rgba(255,255,255,0.04)']
        : ['rgba(255,255,255,0.17)', 'rgba(255,255,255,0.015)', 'rgba(0,0,0,0.13)']}
      locations={[0, 0.48, 1]}
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radius, borderWidth: 1,
          borderColor: disabled ? '#8899AA44' : `${color}70`,
          borderTopColor: disabled ? '#8899AA44' : `${color}CC`,
          borderBottomWidth: pressed ? 1 : 2,
          borderBottomColor: disabled ? '#8899AA44' : `${color}55`,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    />
  );
}

export const NeonTouchableOpacity = forwardRef<View, TouchableOpacityProps & NeonOptions>(function NeonTouchableOpacity({
  children, style, onPressIn, onPressOut, disabled = false,
  neonColor, neonSurface = true, accessibilityRole = 'button', ...props
}, ref) {
  const [pressed, setPressed] = useState(false);
  const { color, dark, reducedMotion } = useNeon(neonColor);
  const down = pressed && !disabled;
  return (
    <TouchableOpacity
      {...props}
      ref={ref}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPressIn={event => { setPressed(true); onPressIn?.(event); }}
      onPressOut={event => { setPressed(false); onPressOut?.(event); }}
      style={relief(style, color, dark, down, disabled, neonSurface, reducedMotion)}
    >
      {children}
      {neonSurface && <NeonBevel style={style} color={color} disabled={disabled} pressed={down} />}
    </TouchableOpacity>
  );
});

export const NeonPressable = forwardRef<View, PressableProps & NeonOptions>(function NeonPressable({
  children, style, disabled = false, neonColor, neonSurface = true, accessibilityRole = 'button', ...props
}, ref) {
  const { color, dark, reducedMotion } = useNeon(neonColor);
  return (
    <Pressable
      {...props}
      ref={ref}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      style={state => relief(typeof style === 'function' ? style(state) : style, color, dark, state.pressed, !!disabled, neonSurface, reducedMotion)}
    >
      {state => <>
        {typeof children === 'function' ? children(state) : children}
        {neonSurface && <NeonBevel style={typeof style === 'function' ? style(state) : style} color={color} disabled={!!disabled} pressed={state.pressed} />}
      </>}
    </Pressable>
  );
});
