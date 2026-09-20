// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Tabs } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { FloatingTabBar } from '@/components/floating-tab-bar';

export default function TabLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bgDeep },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ sceneStyle: { backgroundColor: '#02070D' } }} />
      <Tabs.Screen name="events" options={{ headerShown: true, headerTitle: 'Événements' }} />
      <Tabs.Screen name="wallet" options={{ headerShown: true, headerTitle: 'Wallet CivicLoop' }} />
      <Tabs.Screen name="shops" options={{ headerShown: true, headerTitle: 'Commerces locaux' }} />
      <Tabs.Screen name="fuel" options={{ headerShown: true, headerTitle: 'Prix carburant' }} />
      <Tabs.Screen name="profile" options={{ headerShown: true, headerTitle: 'Mon profil' }} />
    </Tabs>
  );
}
