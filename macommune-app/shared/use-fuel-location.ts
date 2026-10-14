// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface FuelPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

async function currentPosition(): Promise<FuelPosition> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('La géolocalisation n’est pas disponible dans ce navigateur.');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
        error => reject(new Error(error.code === 1
          ? 'Localisation refusée ou bloquée. Autorisez-la dans les réglages du navigateur ; dans un aperçu intégré, ouvrez si nécessaire l’application dans un nouvel onglet.'
          : error.code === 3
            ? 'La localisation prend trop de temps. Vérifiez votre GPS et réessayez.'
            : 'Position indisponible. Activez la localisation de votre appareil et réessayez.')),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    });
  }
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Localisation refusée. Autorisez-la dans les réglages de l’application puis réessayez.');
  }
  if (!await Location.hasServicesEnabledAsync()) {
    throw new Error('Activez la localisation de votre appareil puis réessayez.');
  }
  const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
}

/** One foreground fix on entry/retry; no background tracking or saved coordinates. */
export function useFuelLocation() {
  const [position, setPosition] = useState<FuelPosition | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const generation = useRef(0);

  const locate = useCallback(async () => {
    const request = ++generation.current;
    setLocating(true);
    setPosition(null);
    setLocationError(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        currentPosition(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Délai de localisation dépassé. Autorisez la localisation et réessayez.')), 20000);
        }),
      ]);
      if (request === generation.current) setPosition(result);
    } catch (error) {
      if (request === generation.current) {
        setLocationError(error instanceof Error ? error.message : 'Position indisponible. Réessayez.');
      }
    } finally {
      clearTimeout(timer);
      if (request === generation.current) setLocating(false);
    }
  }, []);

  useEffect(() => {
    void locate();
    return () => { generation.current++; };
  }, [locate]);

  return { position, locating, locationError, locate };
}
