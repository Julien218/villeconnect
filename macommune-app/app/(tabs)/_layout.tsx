// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const GREEN = '#10B981';
const MUTED = '#6B7280';
const DARK  = '#111827';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: DARK,
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#0A0F1E' },
        headerTintColor: '#F9FAFB',
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          headerTitle: '🏙️  Ma Commune',
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Événements',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          headerTitle: '📅 Événements',
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: 'Commerces',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
          headerTitle: '🏪 Commerces locaux',
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Carburant',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
          headerTitle: '⛽ Prix carburant',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
          headerTitle: '💎 CivicWallet',
        }}
      />
    </Tabs>
  );
}
