// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Photos des produits sur Cloudflare R2 (stockage compatible S3, sans frais de sortie).
// Le serveur ne reçoit jamais l'image : il signe une adresse d'envoi temporaire (5 minutes),
// valable pour UN fichier, d'UN type et d'UNE taille précis. L'application envoie la photo
// directement à R2. Les clés d'accès restent dans les variables d'environnement du serveur.
import { createHash, createHmac, randomUUID } from 'node:crypto';

export const R2_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const R2_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type R2ImageType = (typeof R2_IMAGE_TYPES)[number];
const UPLOAD_EXPIRES_SECONDS = 300;

type Env = Record<string, string | undefined>;

export function isR2Configured(env: Env = process.env): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET && env.R2_PUBLIC_URL
  );
}

/** Adresse publique des photos, sans « / » final (ex. https://photos.villeconnectos.com). */
export function r2PublicBase(env: Env = process.env): string {
  return (env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
}

/** Encodage RFC 3986 exigé par la signature AWS (les « / » d'un chemin sont conservés si demandé). */
function uriEncode(value: string, keepSlash = false): string {
  const encoded = encodeURIComponent(value)
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return keepSlash ? encoded.replace(/%2F/g, '/') : encoded;
}

const sha256Hex = (data: string) => createHash('sha256').update(data, 'utf8').digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data, 'utf8').digest();

export interface PresignParams {
  method: 'GET' | 'PUT';
  host: string;
  /** Chemin déjà composé, non encodé (ex. /bucket/products/1/abc.jpg). */
  path: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Date au format AAAAMMJJTHHMMSSZ. */
  amzDate: string;
  expiresSeconds: number;
  /** En-têtes signés en plus de « host » (noms en minuscules). */
  headers?: Record<string, string>;
}

/** Signature AWS Signature Version 4 « par URL » (presigned URL), service S3. */
export function presignUrl(p: PresignParams): string {
  const date = p.amzDate.slice(0, 8);
  const scope = `${date}/${p.region}/s3/aws4_request`;
  const headers: Record<string, string> = { host: p.host, ...(p.headers || {}) };
  const headerNames = Object.keys(headers).map(h => h.toLowerCase()).sort();
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = String(v).trim();
  const signedHeaders = headerNames.join(';');

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${p.accessKeyId}/${scope}`,
    'X-Amz-Date': p.amzDate,
    'X-Amz-Expires': String(p.expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalQuery = Object.keys(query).sort()
    .map(k => `${uriEncode(k)}=${uriEncode(query[k])}`).join('&');
  const canonicalPath = uriEncode(p.path, true);
  const canonicalHeaders = headerNames.map(h => `${h}:${lower[h]}\n`).join('');
  const canonicalRequest = [
    p.method, canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', p.amzDate, scope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac('AWS4' + p.secretAccessKey, date);
  const kRegion = hmac(kDate, p.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
  return `https://${p.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function toAmzDate(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

const EXTENSIONS: Record<R2ImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export interface ProductImageUpload {
  uploadUrl: string;
  /** En-têtes à envoyer tels quels avec le PUT (sinon R2 refuse la signature). */
  headers: Record<string, string>;
  publicUrl: string;
  expiresInSeconds: number;
}

/** Prépare l'envoi d'une photo de produit pour un commerce. */
export function createProductImageUpload(
  commerceId: number,
  contentType: R2ImageType,
  sizeBytes: number,
  env: Env = process.env,
  now: Date = new Date()
): ProductImageUpload {
  const key = `products/${commerceId}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const headers = { 'content-type': contentType, 'content-length': String(sizeBytes) };
  const uploadUrl = presignUrl({
    method: 'PUT',
    host: `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    path: `/${env.R2_BUCKET}/${key}`,
    region: 'auto',
    accessKeyId: env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
    amzDate: toAmzDate(now),
    expiresSeconds: UPLOAD_EXPIRES_SECONDS,
    headers,
  });
  // Content-Length est posé automatiquement par le navigateur / l'application : seul le type est à fournir.
  return {
    uploadUrl,
    headers: { 'Content-Type': contentType },
    publicUrl: `${r2PublicBase(env)}/${key}`,
    expiresInSeconds: UPLOAD_EXPIRES_SECONDS,
  };
}

/**
 * Une photo hébergée sur notre R2 doit appartenir au commerce qui l'enregistre
 * (un commerçant ne peut pas reprendre la photo d'un autre). Les autres adresses restent acceptées.
 */
export function isAllowedProductImage(url: string, commerceId: number, env: Env = process.env): boolean {
  const base = r2PublicBase(env);
  if (!base || !url.startsWith(base + '/')) return true;
  const prefix = `${base}/products/${commerceId}/`;
  return url.startsWith(prefix) && /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(url.slice(prefix.length));
}
