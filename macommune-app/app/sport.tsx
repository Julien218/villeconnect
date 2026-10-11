// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Rubrique Sport : disciplines, clubs, installations et prochains événements sportifs de la commune.
// Un club ou un gestionnaire propose sa fiche depuis cet écran ; l'administration la publie.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';

export interface SportPlace {
  id: number;
  kind: 'club' | 'installation';
  name: string;
  sports: string[];
  description?: string | null;
  address?: string | null;
  audience?: string | null;
  schedule?: string | null;
  priceInfo?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface SportEvent {
  id: number;
  title: string;
  dateStart: string;
  timeLabel?: string | null;
  location?: string | null;
  organizer?: string | null;
}

interface Overview {
  disciplines: { name: string; count: number }[];
  places: SportPlace[];
  events: SportEvent[];
}

const ALL = 'Tous';

function formatEventDate(event: SportEvent) {
  const date = new Date(event.dateStart);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = event.timeLabel?.trim() || date.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function SportScreen() {
  const { theme } = useTheme();
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();
  const s = makeStyles(theme);
  const postalCode = user?.postalCode?.trim() || '7370';
  const cityLabel = user?.city?.trim() || 'Dour';

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discipline, setDiscipline] = useState(ALL);
  const [kind, setKind] = useState<'all' | 'club' | 'installation'>('all');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data: result, error: apiError } = await trpcQuery<Overview>('sport.overview', { postalCode });
    if (apiError || !result) setError(apiError || 'La rubrique Sport est momentanément indisponible.');
    else { setError(null); setData(result); }
    setLoading(false);
    setRefreshing(false);
  }, [postalCode]);

  useEffect(() => { load(); }, [load]);

  const places = useMemo(() => (data?.places || []).filter(place =>
    (discipline === ALL || place.sports.includes(discipline)) && (kind === 'all' || place.kind === kind)
  ), [data, discipline, kind]);

  const open = (url: string) => { Linking.openURL(url).catch(() => undefined); };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      <Stack.Screen options={{ title: 'Sport' }} />

      <GlassCard style={s.hero as any}>
        <View style={s.heroIcon}><Ionicons name="trophy-outline" size={26} color={theme.colors.cyan} /></View>
        <Text style={s.eyebrow}>SPORT À {cityLabel.toUpperCase()}</Text>
        <Text style={s.heroTitle}>Clubs, salles et terrains près de chez vous</Text>
        <Text style={s.muted}>Trouvez une discipline, contactez le club et suivez les prochains matchs et stages.</Text>
      </GlassCard>

      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && error && (
        <GlassCard style={s.card as any}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={s.secondaryBtn} accessibilityRole="button">
            <Text style={s.secondaryText}>Réessayer</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {!loading && data && (
        <>
          {data.disciplines.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {[{ name: ALL, count: data.places.length }, ...data.disciplines].map(item => {
                const selected = discipline === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    onPress={() => setDiscipline(item.name)}
                    style={[s.chip, selected && s.chipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[s.chipText, selected && s.chipTextOn]}>{item.name} · {item.count}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={s.kindRow}>
            {([['all', 'Tout'], ['club', 'Clubs'], ['installation', 'Installations']] as const).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                onPress={() => setKind(value)}
                style={[s.kindBtn, kind === value && s.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === value }}
              >
                <Text style={[s.chipText, kind === value && s.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {data.events.length > 0 && (
            <GlassCard style={s.card as any}>
              <View style={s.rowBetween}>
                <Text style={s.sectionTitle}>Prochains rendez-vous sportifs</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/events?category=Sport' as any)} accessibilityRole="link">
                  <Text style={s.link}>Agenda</Text>
                </TouchableOpacity>
              </View>
              {data.events.map(event => (
                <View key={event.id} style={s.eventRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.cyan} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.eventTitle}>{event.title}</Text>
                    <Text style={s.muted}>
                      {[formatEventDate(event), event.location, event.organizer].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}

          {places.length === 0 && (
            <GlassCard style={s.card as any}>
              <Text style={s.sectionTitle}>
                {data.places.length === 0 ? 'Les premières fiches arrivent' : 'Aucun résultat pour ce filtre'}
              </Text>
              <Text style={s.muted}>
                {data.places.length === 0
                  ? 'Vous gérez un club ou une salle ? Proposez votre fiche ci-dessous : elle sera publiée après vérification.'
                  : 'Essayez une autre discipline.'}
              </Text>
            </GlassCard>
          )}

          {places.map(place => (
            <GlassCard key={place.id} style={s.card as any}>
              <View style={s.rowBetween}>
                <Text style={[s.sectionTitle, { flex: 1 }]}>{place.name}</Text>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{place.kind === 'club' ? 'Club' : 'Installation'}</Text>
                </View>
              </View>
              <Text style={s.sports}>{place.sports.join(' · ')}</Text>
              {place.description ? <Text style={s.muted}>{place.description}</Text> : null}
              {place.audience ? <Info icon="people-outline" text={place.audience} theme={theme} /> : null}
              {place.schedule ? <Info icon="time-outline" text={place.schedule} theme={theme} /> : null}
              {place.priceInfo ? <Info icon="pricetag-outline" text={place.priceInfo} theme={theme} /> : null}
              {place.address ? <Info icon="location-outline" text={place.address} theme={theme} /> : null}
              <View style={s.actions}>
                {place.phone ? (
                  <Action label="Appeler" icon="call-outline" onPress={() => open(`tel:${place.phone!.replace(/\s/g, '')}`)} theme={theme} />
                ) : null}
                {place.email ? (
                  <Action label="Email" icon="mail-outline" onPress={() => open(`mailto:${place.email}`)} theme={theme} />
                ) : null}
                {place.website ? (
                  <Action label="Site" icon="globe-outline" onPress={() => open(place.website!)} theme={theme} />
                ) : null}
                {place.address ? (
                  <Action
                    label="Itinéraire" icon="navigate-outline" theme={theme}
                    onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address!)}`)}
                  />
                ) : null}
              </View>
            </GlassCard>
          ))}

          <GlassCard style={s.card as any}>
            <Text style={s.sectionTitle}>Vous gérez un club ou une installation ?</Text>
            <Text style={s.muted}>
              Proposez votre fiche gratuitement. Elle apparaît ici après une vérification rapide par l’administration.
            </Text>
            {!showForm && (
              <TouchableOpacity
                onPress={() => (isLoggedIn ? setShowForm(true) : router.push('/login'))}
                style={s.primaryBtn}
                accessibilityRole="button"
              >
                <Text style={s.primaryText}>{isLoggedIn ? 'Proposer une fiche' : 'Se connecter pour proposer'}</Text>
              </TouchableOpacity>
            )}
            {showForm && <SportPlaceForm postalCode={postalCode} theme={theme} onDone={() => setShowForm(false)} />}
          </GlassCard>
        </>
      )}
    </ScrollView>
  );
}

function Info({ icon, text, theme }: { icon: keyof typeof Ionicons.glyphMap; text: string; theme: ThemeTokens }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={15} color={theme.colors.textSecondary} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

function Action({ label, icon, onPress, theme }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; theme: ThemeTokens;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12,
        borderRadius: 18, borderWidth: 1, borderColor: theme.colors.borderCyan,
      }}
    >
      <Ionicons name={icon} size={14} color={theme.colors.cyan} />
      <Text style={{ color: theme.colors.cyan, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Formulaire de proposition d'une fiche (club ou installation), réutilisé par l'administration. */
export function SportPlaceForm({ postalCode, theme, onDone, admin = false }: {
  postalCode: string; theme: ThemeTokens; onDone: () => void; admin?: boolean;
}) {
  const s = makeStyles(theme);
  const [kind, setKind] = useState<'club' | 'installation'>('club');
  const [name, setName] = useState('');
  const [sports, setSports] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [audience, setAudience] = useState('');
  const [schedule, setSchedule] = useState('');
  const [priceInfo, setPriceInfo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async () => {
    const sportList = sports.split(',').map(item => item.trim()).filter(item => item.length >= 2);
    if (name.trim().length < 2 || sportList.length === 0) {
      setMessage({ text: 'Indiquez le nom et au moins une discipline (séparées par des virgules).', ok: false });
      return;
    }
    const site = website.trim();
    setBusy(true);
    const { error } = await trpcMutation(admin ? 'sport.adminUpsert' : 'sport.submit', {
      postalCode, kind, name: name.trim(), sports: sportList,
      description: description.trim() || undefined, address: address.trim() || undefined,
      audience: audience.trim() || undefined, schedule: schedule.trim() || undefined,
      priceInfo: priceInfo.trim() || undefined, phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : undefined,
    }, { authenticated: true });
    setBusy(false);
    if (error) { setMessage({ text: error, ok: false }); return; }
    setMessage({
      text: admin ? 'Fiche publiée.' : 'Merci ! Votre fiche sera visible après vérification.',
      ok: true,
    });
    setName(''); setSports(''); setDescription(''); setAddress(''); setAudience('');
    setSchedule(''); setPriceInfo(''); setPhone(''); setEmail(''); setWebsite('');
    setTimeout(onDone, 1800);
  };

  const field = (value: string, onChange: (text: string) => void, placeholder: string, extra?: object) => (
    <TextInput
      style={s.input} value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted} {...extra}
    />
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={s.kindRow}>
        {([['club', 'Club'], ['installation', 'Installation']] as const).map(([value, label]) => (
          <TouchableOpacity
            key={value} onPress={() => setKind(value)}
            style={[s.kindBtn, kind === value && s.chipOn]}
            accessibilityRole="radio" accessibilityState={{ selected: kind === value }}
          >
            <Text style={[s.chipText, kind === value && s.chipTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {field(name, setName, kind === 'club' ? 'Nom du club' : 'Nom de l’installation (salle, terrain…)', { maxLength: 160 })}
      {field(sports, setSports, 'Disciplines, séparées par des virgules (ex. Football, Futsal)', { maxLength: 255 })}
      {field(description, setDescription, 'Présentation courte (facultatif)', { maxLength: 1000, multiline: true })}
      {field(audience, setAudience, 'Public (ex. enfants dès 6 ans, adultes, seniors)', { maxLength: 120 })}
      {field(schedule, setSchedule, 'Horaires (ex. mercredi 14h–16h, samedi 9h–12h)', { maxLength: 255 })}
      {field(priceInfo, setPriceInfo, 'Tarifs (ex. cotisation 120 €/an, essai gratuit)', { maxLength: 160 })}
      {field(address, setAddress, 'Adresse', { maxLength: 255 })}
      {field(phone, setPhone, 'Téléphone', { maxLength: 40, keyboardType: 'phone-pad' })}
      {field(email, setEmail, 'Email de contact', { maxLength: 190, keyboardType: 'email-address', autoCapitalize: 'none' })}
      {field(website, setWebsite, 'Site web ou page Facebook', { maxLength: 500, autoCapitalize: 'none' })}
      {message && <Text style={message.ok ? s.okText : s.errorText} accessibilityLiveRegion="polite">{message.text}</Text>}
      <TouchableOpacity onPress={submit} disabled={busy} style={[s.primaryBtn, busy && { opacity: 0.5 }]} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>{admin ? 'Publier la fiche' : 'Envoyer la fiche'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onDone} style={s.secondaryBtn} accessibilityRole="button">
        <Text style={s.secondaryText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 40, alignItems: 'center' },
    hero: { padding: 18, gap: 8 },
    heroIcon: {
      width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.cyanSoft, borderWidth: 1, borderColor: theme.colors.borderCyan,
    },
    heroTitle: { color: theme.colors.textPrimary, fontSize: 21, fontWeight: '900' },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    card: { padding: 16, gap: 8 },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    sports: { color: theme.colors.cyan, fontSize: 13, fontWeight: '800' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    link: { color: theme.colors.cyan, fontSize: 12, fontWeight: '800' },
    chips: { gap: 8, paddingRight: 16 },
    chip: {
      minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSolid,
    },
    chipOn: { borderColor: theme.colors.cyan, backgroundColor: theme.colors.cyanSoft },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800' },
    chipTextOn: { color: theme.colors.cyan },
    kindRow: { flexDirection: 'row', gap: 8 },
    kindBtn: {
      flex: 1, minHeight: 38, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.border,
    },
    eventRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingTop: 6 },
    eventTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800' },
    badge: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
      backgroundColor: theme.colors.cyanSoft, borderWidth: 1, borderColor: theme.colors.borderCyan,
    },
    badgeText: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 13,
    },
    primaryBtn: {
      minHeight: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.electric,
    },
    primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    secondaryBtn: {
      minHeight: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.borderCyan,
    },
    secondaryText: { color: theme.colors.cyan, fontSize: 13, fontWeight: '800' },
    okText: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
  });
}
