// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Le Centre de Contrôle : signature visuelle officielle de la plateforme.
// Jamais une grille — les modules gravitent en cercle autour du C, reliés par un réseau
// lumineux animé. Appui simple sur une appli -> navigation. Appui long -> mode personnalisation
// (glisser-déposer, ajout/suppression), à la iOS "jiggle mode".
import { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { useFavorites } from '@/shared/favorites-store';
import { LivingC } from './living-c';
import { HexFavorite } from './hex-favorite';
import { DraggableHex } from './draggable-hex';
import { NetworkLines } from './network-lines';
import { AiBubble, AiContext } from './ai-bubble';
import { ModuleDef } from '@/shared/control-center-types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CENTER_X = SCREEN_W / 2;
const CENTER_Y = SCREEN_H * 0.44;
const RING_RADIUS = Math.min(SCREEN_W, SCREEN_H) * 0.3;
const HEX_SIZE = 68;

const PULSE_STATES = ['notification', 'new', 'urgent', 'error'];
const STATE_PULSE_COLOR: Record<string, string> = {
  notification: '#00E5FF', new: '#00E5FF', urgent: '#F59E0B', error: '#F87171',
};

function slotPosition(index: number, total: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const x = CENTER_X + RING_RADIUS * Math.cos(angle) - HEX_SIZE / 2;
  const y = CENTER_Y + RING_RADIUS * Math.sin(angle) - HEX_SIZE / 2;
  return { x, y, angle };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  aiContext?: AiContext;
}

export function ControlCenterModal({ visible, onClose, aiContext = {} }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const s = makeStyles(theme);
  const { favorites, available, addFavorite, removeFavorite, reorder } = useFavorites();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const total = favorites.length + (editMode ? 1 : 0);
  const points = useMemo(
    () => favorites.map((f, i) => {
      const { x, y } = slotPosition(i, total);
      return {
        x: x + HEX_SIZE / 2, y: y + HEX_SIZE / 2,
        pulsing: PULSE_STATES.includes(f.state),
        color: STATE_PULSE_COLOR[f.state] ?? theme.colors.cyan,
      };
    }),
    [favorites, total],
  );

  function handleClose() {
    setEditMode(false);
    setPickerOpen(false);
    onClose();
  }

  function handlePress(mod: ModuleDef) {
    if (editMode) return;
    handleClose();
    router.push(mod.route as any);
  }

  function enterEditMode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditMode(true);
  }

  function handleDropAt(fromIndex: number, absX: number, absY: number) {
    // Détermine l'angle du point de dépose relatif au centre, puis le slot le plus proche.
    const dx = absX - CENTER_X;
    const dy = absY - CENTER_Y;
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    const raw = (angle / (2 * Math.PI)) * favorites.length;
    const nearest = Math.round(raw) % favorites.length;
    if (nearest !== fromIndex) reorder(fromIndex, nearest);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <BlurView intensity={40} tint={theme.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={theme.mode === 'dark'
            ? ['rgba(6,11,24,0.55)', 'rgba(6,11,24,0.94)']
            : ['rgba(245,247,250,0.6)', 'rgba(245,247,250,0.96)']}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={s.topBar}>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose} hitSlop={10}>
            <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Centre de Contrôle</Text>
          {editMode ? (
            <TouchableOpacity onPress={() => setEditMode(false)}>
              <Text style={s.doneLabel}>Terminé</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>

        <AiBubble ctx={aiContext} />

        <NetworkLines width={SCREEN_W} height={SCREEN_H} cx={CENTER_X} cy={CENTER_Y} points={points} />

        {/* Le C, toujours au centre */}
        <View style={[s.centerHub, { left: CENTER_X - 60, top: CENTER_Y - 60 }]}>
          <LivingC size={64} pulsing={points.some(p => p.pulsing)} />
        </View>

        {favorites.map((fav, i) => {
          const { x, y } = slotPosition(i, total);
          return (
            <DraggableHex
              key={fav.key}
              x={x} y={y} size={HEX_SIZE}
              editMode={editMode}
              onDropAt={(ax, ay) => handleDropAt(i, ax, ay)}
            >
              <MotiView
                from={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: i * 70, damping: 12 }}
              >
                <HexFavorite
                  item={fav}
                  size={HEX_SIZE}
                  editMode={editMode}
                  onPress={() => handlePress(fav)}
                  onLongPress={enterEditMode}
                  onRemove={() => removeFavorite(fav.key)}
                />
              </MotiView>
            </DraggableHex>
          );
        })}

        {editMode && (() => {
          const { x, y } = slotPosition(favorites.length, total);
          return (
            <MotiView
              style={{ position: 'absolute', left: x, top: y, width: HEX_SIZE, alignItems: 'center' }}
              from={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: favorites.length * 70, damping: 12 }}
            >
              <TouchableOpacity style={s.addHex} onPress={() => setPickerOpen(true)}>
                <Ionicons name="add" size={26} color={theme.colors.cyan} />
              </TouchableOpacity>
              <Text style={s.addLabel}>Ajouter</Text>
            </MotiView>
          );
        })()}

        <Text style={s.hint}>
          {editMode ? 'Glissez pour réorganiser, ✕ pour retirer' : 'Appui long sur une appli pour personnaliser'}
        </Text>
      </BlurView>

      {pickerOpen && (
        <View style={s.pickerOverlay}>
          <View style={s.pickerSheet}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Ajouter un module</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.pickerGrid}>
              {available.map(m => {
                const c = theme.colors.modules[m.colorKey] ?? theme.colors.modules.commune;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={s.pickerItem}
                    onPress={() => { addFavorite(m.key); setPickerOpen(false); }}
                  >
                    <View style={[s.pickerIcon, { backgroundColor: c.bg }]}>
                      <Ionicons name={m.icon} size={20} color={c.fg} />
                    </View>
                    <Text style={s.pickerLabel} numberOfLines={1}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
              {available.length === 0 && (
                <Text style={s.pickerEmpty}>Tous les modules sont déjà dans vos favoris.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    topBar: {
      position: 'absolute', top: 54, left: 0, right: 0, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10,
    },
    closeBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceSolid,
      borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 14, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 0.5, fontFamily: theme.fonts.semibold },
    doneLabel: { color: theme.colors.cyan, fontWeight: '800', fontSize: 13.5, fontFamily: theme.fonts.semibold },
    centerHub: { position: 'absolute', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    addHex: {
      width: 68, height: 68, borderRadius: 22, borderWidth: 1.6, borderStyle: 'dashed',
      borderColor: theme.colors.cyan, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.cyanSoft,
    },
    addLabel: { marginTop: 6, fontSize: 10.5, fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.semibold },
    hint: {
      position: 'absolute', bottom: 46, left: 0, right: 0, textAlign: 'center',
      fontSize: 11.5, color: theme.colors.textMuted, fontFamily: theme.fonts.medium,
    },
    pickerOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: theme.colors.surfaceSolid, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
      maxHeight: '60%', paddingBottom: 30, borderWidth: 1, borderColor: theme.colors.border,
    },
    pickerHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    pickerTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, fontFamily: theme.fonts.semibold },
    pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 14 },
    pickerItem: { width: 78, alignItems: 'center' },
    pickerIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    pickerLabel: { fontSize: 10.5, color: theme.colors.textSecondary, fontFamily: theme.fonts.medium, textAlign: 'center' },
    pickerEmpty: { color: theme.colors.textMuted, fontSize: 13, padding: 20, fontFamily: theme.fonts.medium },
  });
}
