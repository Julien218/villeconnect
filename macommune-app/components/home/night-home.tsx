// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ServiceOrbit } from './service-orbit';
import { FeatureNotice, FeatureNoticeContent } from './feature-notice';

const PREVIEW_EVENTS = [
  { title: 'Fête de la\nMusique', date: '21 juin 2026', location: 'Place Verte', icon: 'musical-notes-outline', color: '#00BFFF' },
  { title: 'Eco Day', date: '28 juin 2026', location: 'Parc communal', icon: 'leaf-outline', color: '#00DDC1' },
  { title: 'Feu d’artifice', date: '13 juillet 2026', location: 'Étang communal', icon: 'sparkles-outline', color: '#A266FF' },
] as const;
const STORIES = [
  { eyebrow: 'À LA UNE', title: 'Votre ville lance\nson app mobile !', copy: 'Toute votre ville dans\nvotre poche.', route: '/landing' },
  { eyebrow: 'VIE LOCALE', title: 'Vos commerces,\ntout près de vous.', copy: 'Découvrez les bonnes adresses\nde votre commune.', route: '/shops' },
  { eyebrow: 'CIVICLOOP', title: 'Agir pour sa ville,\nça vous récompense.', copy: 'Missions citoyennes et\nrécompenses locales.', route: '/wallet' },
  { eyebrow: 'VOTRE COMMUNE', title: 'Vos démarches,\nen toute simplicité.', copy: 'Retrouvez les liens vers\nvos services publics.', route: '/services' },
];
export function NightHome({ city, events = [] }: { city: string; events?: { id: string | number; title: string; dateStart?: string; location?: string }[] }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const k = Math.min(width, 473) / 473;
  const [slide, setSlide] = useState(0);
  const [notice, setNotice] = useState<FeatureNoticeContent | null>(null);
  const story = STORIES[slide];
  const illustrated = events.length === 0;
  const items = illustrated ? PREVIEW_EVENTS : events.slice(0, 3).map((event, i) => ({
    title: event.title, date: event.dateStart ? new Date(event.dateStart).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long' }) : 'À confirmer',
    location: event.location || '', icon: PREVIEW_EVENTS[i].icon, color: PREVIEW_EVENTS[i].color,
  }));
  return (
    <View style={s.screen}>
      <View style={[s.hero, { height: 248 * k }]}>
        <ImageBackground source={require('@/assets/night-skyline.webp')} style={s.skyline} resizeMode="cover">
          <LinearGradient colors={['#02070D', 'rgba(2,7,13,0)', 'rgba(2,7,13,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['#02070D', 'transparent', 'transparent', '#02070D']} locations={[0, 0.22, 0.7, 1]} style={StyleSheet.absoluteFill} />
        </ImageBackground>
        <View style={[s.greeting, { top: 28 * k, left: 21 * k }]}>
          <Text style={[s.hello, { fontSize: 15 * k }]}>Bonjour</Text>
          <Text accessibilityRole="header" style={[s.city, { fontSize: 34 * k }]}>{city}</Text>
          <Text style={[s.tagline, { fontSize: 15 * k, lineHeight: 23 * k }]}>Votre ville, connectée{ '\n' }<Text style={s.cyan}>au quotidien.</Text></Text>
          <View style={[s.weather, { marginTop: 24 * k }]} accessibilityLabel="Aperçu météo illustratif : 16 degrés, nuageux">
            <Ionicons name="partly-sunny-outline" size={43 * k} color="#D7E4F1" />
            <View><Text style={[s.temperature, { fontSize: 24 * k }]}>16°</Text><Text style={[s.muted, { fontSize: 11 * k }]}>Nuageux · aperçu</Text></View>
          </View>
        </View>
        <View style={[s.topActions, { top: 24 * k, right: 21 * k }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Rechercher dans l’annuaire" style={s.circle} onPress={() => router.push('/shops' as any)}>
            <Ionicons name="search-outline" size={23} color="#F4F7FA" />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" style={s.circle} onPress={() => setNotice({ title: 'Notifications', text: 'Les alertes locales font partie des modules prévus. Aucun flux de notifications n’est encore connecté à cet aperçu.' })}>
            <Ionicons name="notifications-outline" size={22} color="#F4F7FA" /><View style={s.notificationDot} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity neonSurface={false} accessibilityRole="button" accessibilityLabel="Assistant IA" style={[s.assistant, { top: 94 * k, right: 19 * k }]}
          onPress={() => setNotice({ title: 'Votre futur assistant IA', text: 'Un assistant pour vous orienter dans la vie locale et les services de votre ville. Cette interface est un aperçu : aucun assistant IA n’est encore connecté.' })}>
          <LinearGradient colors={['#006CFF', '#00CFFF', '#0647FA']} style={s.assistantRing}>
            <View style={s.assistantCore}><Ionicons name="pulse" size={31} color="#00CFFF" /></View>
          </LinearGradient>
          <Text style={s.assistantLabel}>Assistant IA</Text>
        </TouchableOpacity>
        <View style={s.heroLine} />
      </View>

      <View style={[s.news, { height: 209 * k, marginHorizontal: 18 * k }]}>
        <LinearGradient colors={['#06253E', '#030C16', '#02070D']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
        <Image source={require('@/assets/night-phone.webp')} style={s.phone} resizeMode="cover" />
        <LinearGradient colors={['#030D17', 'rgba(3,13,23,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.phoneFade} />
        <View style={[s.newsCopy, { padding: 20 * k }]}>
          <Text style={[s.eyebrow, { fontSize: 11 * k }]}>{story.eyebrow}</Text>
          <Text accessibilityRole="header" style={[s.headline, { fontSize: 20 * k, lineHeight: 25 * k }]}>{slide === 0 ? `${city} lance\nson app mobile !` : story.title}</Text>
          <Text style={[s.newsDescription, { fontSize: 12 * k, lineHeight: 19 * k }]}>{slide === 0 ? `Tout ${city} dans\nvotre poche.` : story.copy}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Découvrir" onPress={() => router.push(story.route as any)} style={[s.discover, { marginTop: 12 * k, paddingVertical: 8 * k }]}>
            <Text style={[s.cyan, { fontSize: 12 * k }]}>Découvrir</Text><Ionicons name="chevron-forward" size={15} color="#CBEFFF" />
          </TouchableOpacity>
        </View>
        <View style={s.pagination}>{STORIES.map((_, index) => (
          <TouchableOpacity neonSurface={false} key={index} accessibilityRole="button" accessibilityLabel={`Actualité ${index + 1}`} accessibilityState={{ selected: slide === index }} onPress={() => setSlide(index)} style={s.dotTarget}>
            <View style={[s.dot, slide === index && s.dotActive]} />
          </TouchableOpacity>
        ))}</View>
      </View>

      <View style={{ marginHorizontal: 18 * k, marginTop: 15 * k }}>
        <ServiceOrbit width={437 * k} onWallet={() => router.push('/wallet' as any)} onService={service => {
          if (service.route) router.push(service.route as any);
          else setNotice({ title: 'Signalement citoyen', text: 'Le signalement d’un problème dans votre commune fait partie des futurs modules citoyens. Le formulaire de signalement n’est pas encore disponible.' });
        }} />
      </View>

      <View style={[s.events, { marginHorizontal: 18 * k, marginTop: 9 * k }]}>
        <View style={s.eventsHeading}>
          <Text style={[s.eventsTitle, { fontSize: 12 * k }]}>Événements à venir</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voir tous les événements" onPress={() => router.push('/events' as any)} style={s.seeAll}><Text style={[s.cyan, { fontSize: 11 * k }]}>Voir tout</Text><Ionicons name="chevron-forward" color="#00BFFF" size={14} /></TouchableOpacity>
        </View>
        <View style={s.eventRow}>
          {items.map((event, index) => (
            <TouchableOpacity neonColor={event.color} key={index} accessibilityRole="button" accessibilityLabel={event.title.replace('\n', ' ')} activeOpacity={0.8}
              onPress={() => illustrated ? setNotice({ title: event.title.replace('\n', ' '), text: 'Cet événement provient de votre maquette et illustre le futur agenda. Les événements réellement publiés sont accessibles dans « Voir tout ».' }) : router.push('/events' as any)}
              style={[s.eventCard, { minHeight: 100 * k, paddingHorizontal: 8 * k, gap: 7 * k }]}>
              <View style={[s.eventIcon, { borderColor: event.color, width: 41 * k, height: 44 * k }]}><Ionicons name={event.icon} size={27 * k} color={event.color} /></View>
              <View style={s.eventCopy}><Text style={[s.eventTitle, { fontSize: 11 * k }]} numberOfLines={2}>{event.title}</Text><Text style={[s.eventDate, { fontSize: 9 * k }]}>{event.date}</Text><Text style={[s.muted, { fontSize: 9 * k }]} numberOfLines={2}>{event.location}</Text></View>
              <View style={[s.eventLine, { backgroundColor: event.color }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {illustrated && <Text style={s.previewNote}>Événements illustratifs issus de votre maquette</Text>}
      <FeatureNotice notice={notice} onClose={() => setNotice(null)} />
    </View>
  );
}
const s = StyleSheet.create({
  screen: { backgroundColor: '#02070D' },
  hero: { position: 'relative', overflow: 'hidden' },
  skyline: { position: 'absolute', right: 0, top: 27, bottom: 0, width: '78%' },
  greeting: { position: 'absolute' },
  hello: { color: '#00BFFF', marginBottom: 3 },
  city: { color: '#FAFAFC', fontWeight: '700', letterSpacing: -0.8 },
  tagline: { color: '#E0E5EB', marginTop: 3 },
  cyan: { color: '#00BFFF' },
  muted: { color: '#8F9AAE', marginTop: 3 },
  weather: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  temperature: { color: '#FFFFFF', fontWeight: '500' },
  topActions: { position: 'absolute', flexDirection: 'row', gap: 10 },
  circle: { width: 40, height: 40, backgroundColor: 'rgba(6,17,30,0.8)', borderColor: '#142639', borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: 2, top: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#009DFF' },
  assistant: { position: 'absolute', alignItems: 'center', gap: 7 },
  assistantRing: { width: 51, height: 55, padding: 2, borderRadius: 30, shadowColor: '#007AFF', shadowOpacity: 0.8, shadowRadius: 15 },
  assistantCore: { flex: 1, backgroundColor: '#021124', borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  assistantLabel: { fontSize: 9, color: '#D5DDEA' },
  heroLine: { position: 'absolute', bottom: 17, left: 21, width: 130, height: 1, backgroundColor: '#254051' },
  news: { borderWidth: 1, borderColor: '#173449', borderRadius: 20, overflow: 'hidden' },
  phone: { position: 'absolute', height: '112%', width: '45%', right: 0, bottom: 0 },
  phoneFade: { position: 'absolute', left: '53%', width: '10%', top: 0, bottom: 0 },
  newsCopy: { width: '64%' },
  eyebrow: { color: '#00BFFF', marginBottom: 7 },
  headline: { color: '#FFFFFF', fontWeight: '600', letterSpacing: -0.5 },
  newsDescription: { color: '#E0E4E8', marginTop: 8 },
  discover: { borderWidth: 1, borderColor: '#14425D', borderRadius: 11, alignSelf: 'flex-start', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: 'rgba(2,10,20,0.8)' },
  pagination: { position: 'absolute', bottom: 5, left: '41%', flexDirection: 'row' },
  dotTarget: { paddingHorizontal: 5, paddingVertical: 10 },
  dot: { width: 5, height: 5, borderRadius: 5, backgroundColor: '#536173', boxShadow: '0 2px 0 #001126, inset 0 1px 0 #9BCEEE, 0 0 5px #008FFF66' },
  dotActive: { width: 14, backgroundColor: '#009FFF' },
  events: { padding: 8, borderWidth: 1, borderColor: '#152B40', borderRadius: 18, backgroundColor: '#030910' },
  eventsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 7, paddingVertical: 5, marginBottom: 8 },
  eventsTitle: { color: '#F5F7FA', fontWeight: '500' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  eventRow: { flexDirection: 'row', gap: 7 },
  eventCard: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingTop: 14, paddingBottom: 13, borderWidth: 1, borderColor: '#183650', borderRadius: 14, backgroundColor: '#040F1A' },
  eventIcon: { borderWidth: 0.7, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  eventCopy: { flex: 1, paddingTop: 3 },
  eventTitle: { color: '#FFFFFF', fontWeight: '500' },
  eventDate: { color: '#C1CAD5', marginTop: 6 },
  eventLine: { position: 'absolute', width: 22, height: 1, bottom: 7, left: '37%' },
  previewNote: { color: '#647789', fontSize: 8, textAlign: 'center', marginTop: 8, marginBottom: 4 },
});
