// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Photo d'un produit : choix dans la galerie, réduction sur l'appareil (environ 200 à 300 Ko),
// puis envoi direct vers Cloudflare R2 grâce à une adresse temporaire signée par le serveur.
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { trpcMutation } from './api-client';

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.72;
const MAX_BYTES = 2 * 1024 * 1024;

interface UploadTicket {
  uploadUrl: string;
  headers: Record<string, string>;
  publicUrl: string;
}

/** Retourne l'adresse publique de la photo, null si le commerçant a annulé, ou une erreur lisible. */
export async function pickAndUploadProductPhoto(
  commerceId: number
): Promise<{ url: string | null; error: string | null }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { url: null, error: 'Autorisez l’accès à vos photos dans les réglages pour ajouter une image.' };
  }
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.[0]) return { url: null, error: null };

  const asset = picked.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (!asset.width || asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  const blob = await (await fetch(saved.uri)).blob();
  if (blob.size > MAX_BYTES) return { url: null, error: 'Photo trop lourde, même après réduction. Essayez-en une autre.' };

  const { data, error } = await trpcMutation<UploadTicket>(
    'merchant.productImageUpload',
    { commerceId, contentType: 'image/jpeg', sizeBytes: blob.size },
    { authenticated: true }
  );
  if (error || !data) return { url: null, error: error || 'Envoi de la photo impossible.' };

  try {
    const response = await fetch(data.uploadUrl, { method: 'PUT', headers: data.headers, body: blob });
    if (!response.ok) return { url: null, error: `Envoi de la photo refusé (${response.status}). Réessayez.` };
  } catch {
    return { url: null, error: 'Envoi de la photo impossible : vérifiez votre connexion.' };
  }
  return { url: data.publicUrl, error: null };
}
