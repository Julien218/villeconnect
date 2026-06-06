// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Link, Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  // Redirection automatique vers l'accueil après 1 seconde
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Redirection...' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🏙️</Text>
        <Text style={styles.title}>Ma Commune</Text>
        <Text style={styles.subtitle}>Redirection en cours...</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0F1E',
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#F9FAFB', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280' },
});
