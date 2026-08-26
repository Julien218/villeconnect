// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Menu radial premium ouvert par appui long (500ms) sur le C.
// Actions rapides disposées en éventail au-dessus du bouton, animation fluide (Moti).
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { RADIAL_ACTIONS, RadialAction } from '@/shared/control-center-types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  originX: number; // position du bouton C au moment de l'appui long
  originY: number;
  onClose: () => void;
  onSelect: (action: RadialAction) => void;
}

export function RadialQuickMenu({ visible, originX, originY, onClose, onSelect }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const N = RADIAL_ACTIONS.length;
  const radius = 128;
  // Éventail semi-circulaire au-dessus du bouton (évite de sortir de l'écran).
  const startAngle = Math.PI * 1.08;
  const endAngle = Math.PI * 1.92;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <AnimatePresence>
        {visible && (
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose}>
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 180 }}
              style={[StyleSheet.absoluteFill, s.backdrop]}
            >
              {RADIAL_ACTIONS.map((action, i) => {
                const angle = startAngle + ((endAngle - startAngle) * i) / (N - 1);
                const x = originX + radius * Math.cos(angle);
                const y = originY + radius * Math.sin(angle) * 0.82;
                return (
                  <MotiView
                    key={action.key}
                    from={{ opacity: 0, scale: 0.3, translateX: 0, translateY: 0 }}
                    animate={{ opacity: 1, scale: 1, translateX: x - originX, translateY: y - originY }}
                    exit={{ opacity: 0, scale: 0.3, translateX: 0, translateY: 0 }}
                    transition={{ type: 'spring', delay: i * 35, damping: 14 }}
                    style={[s.itemWrap, { left: originX - 24, top: originY - 24 }]}
                  >
                    <TouchableOpacity
                      style={s.item}
                      activeOpacity={0.8}
                      onPress={() => { onSelect(action); onClose(); }}
                    >
                      <Ionicons name={action.icon} size={19} color={theme.colors.cyan} />
                    </TouchableOpacity>
                    <Text style={s.itemLabel} numberOfLines={1}>{action.label}</Text>
                  </MotiView>
                );
              })}
            </MotiView>
          </TouchableOpacity>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    backdrop: { backgroundColor: 'rgba(6,11,24,0.55)' },
    itemWrap: { position: 'absolute', width: 48, alignItems: 'center' },
    item: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceSolid,
      borderWidth: 1.4, borderColor: theme.colors.borderCyan, alignItems: 'center', justifyContent: 'center',
      ...theme.shadow.glow,
    },
    itemLabel: {
      marginTop: 5, fontSize: 9.5, fontWeight: '700', color: '#fff', fontFamily: theme.fonts.semibold,
      textAlign: 'center', width: 90, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4,
    },
  });
}
