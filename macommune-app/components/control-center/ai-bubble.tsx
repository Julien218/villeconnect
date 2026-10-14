// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Bulle de l'Assistant IA affichée en tête du Centre de Contrôle.
// Compagnon contextuel : connaît les événements, travaux, commerces, démarches et
// préférences de l'utilisateur. Le texte est généré ici à partir des données déjà
// chargées par l'écran d'accueil (pas d'appel IA supplémentaire nécessaire pour ce
// résumé factuel — un vrai backend conversationnel reste branchable sur le même point d'entrée).
import { View, Text, StyleSheet, } from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';

export interface AiContext {
  firstName?: string;
  eventsToday?: number;
  alert?: string | null;
}

export function buildAiMessage(ctx: AiContext): string {
  const name = ctx.firstName ? `Bonjour ${ctx.firstName}` : 'Bonjour';
  const parts: string[] = [name];
  if (ctx.alert) parts.push(ctx.alert);
  else if (ctx.eventsToday && ctx.eventsToday > 0) {
    parts.push(`${ctx.eventsToday} événement${ctx.eventsToday > 1 ? 's' : ''} aujourd'hui`);
  } else {
    parts.push('Votre ville est calme aujourd’hui');
  }
  return parts.join(' — ');
}

export function AiBubble({ ctx, onPress }: { ctx: AiContext; onPress?: () => void }) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  return (
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 420 }}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={s.wrap}>
        <View style={s.iconDot}>
          <Ionicons name="sparkles" size={14} color={theme.colors.cyan} />
        </View>
        <Text style={s.text} numberOfLines={2}>{buildAiMessage(ctx)}</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </MotiView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center',
      backgroundColor: theme.colors.surfaceSolid, borderWidth: 1, borderColor: theme.colors.borderCyan,
      paddingVertical: 10, paddingHorizontal: 16, borderRadius: theme.radius.pill, marginTop: 8,
      maxWidth: '88%',
    },
    iconDot: {
      width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    text: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: theme.colors.textPrimary, fontFamily: theme.fonts.medium },
  });
}
