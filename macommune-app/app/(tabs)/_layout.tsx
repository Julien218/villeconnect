// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Tabs } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useReducedMotion } from 'react-native-reanimated';
import { futuristicTabTransition, TRANSITION_DURATION, transitionEasing } from '@/components/screen-transition';

export default function TabLayout() {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        animation: reducedMotion ? 'none' : 'shift',
        sceneStyle: { backgroundColor: theme.colors.bgDeep },
        sceneStyleInterpolator: reducedMotion ? undefined : futuristicTabTransition,
        transitionSpec: {
          animation: 'timing',
          config: { duration: reducedMotion ? 0 : TRANSITION_DURATION, easing: transitionEasing },
        },
        headerStyle: { backgroundColor: theme.colors.bgDeep },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ sceneStyle: { backgroundColor: '#02070D' } }} />
      <Tabs.Screen name="events" options={{ headerShown: true, headerTitle: 'Événements' }} />
      <Tabs.Screen name="shops" options={{ headerShown: true, headerTitle: 'Commerces locaux' }} />
      <Tabs.Screen name="fuel" options={{ headerShown: true, headerTitle: 'Prix carburant' }} />
      <Tabs.Screen name="profile" options={{ headerShown: true, headerTitle: 'Mon profil' }} />
    </Tabs>
  );
}
