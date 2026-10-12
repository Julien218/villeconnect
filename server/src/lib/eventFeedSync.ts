// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Synchronisation des flux iCal : télécharge, lit, puis enregistre les événements à venir.
// Les événements importés restent en attente de validation, sauf flux marqué « auto_approve ».
import { db } from '../db';
import { assertPublicHost, parseFeedUrl } from './feedUrl';
import { parseIcal } from './icalParser';

const MAX_BYTES = 1024 * 1024; // 1 Mo
const TIMEOUT_MS = 10_000;
const MAX_IMPORT = 200;

export interface FeedRow {
  id: number;
  name: string;
  postal_code: string;
  feed_url: string;
  default_category: string;
  organizer: string | null;
  auto_approve: number;
}

export interface SyncResult { ok: boolean; message: string; count: number }

async function download(rawUrl: string): Promise<string> {
  const url = parseFeedUrl(rawUrl);
  await assertPublicHost(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Pas de redirection suivie : une redirection pourrait mener vers une adresse interne.
    const response = await fetch(url, {
      redirect: 'error',
      signal: controller.signal,
      headers: { Accept: 'text/calendar, text/plain;q=0.8', 'User-Agent': 'VilleConnectOS-EventFeed/1.0' },
    });
    if (!response.ok) throw new Error(`Réponse ${response.status} du site source.`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new Error('Flux trop volumineux.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Flux vide.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) { await reader.cancel(); throw new Error('Flux trop volumineux.'); }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    clearTimeout(timer);
  }
}

const toSql = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

export async function syncFeed(feed: FeedRow): Promise<SyncResult> {
  let result: SyncResult;
  try {
    const text = await download(feed.feed_url);
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('Ce n’est pas un calendrier iCal (.ics).');

    const now = Date.now();
    const horizon = now + 366 * 24 * 3600 * 1000;
    const upcoming = parseIcal(text)
      .filter(event => event.start.getTime() >= now - 24 * 3600 * 1000 && event.start.getTime() <= horizon)
      .slice(0, MAX_IMPORT);

    const status = feed.auto_approve ? 'approved' : 'pending';
    for (const event of upcoming) {
      // Une fiche déjà modérée (publiée ou refusée) n'est jamais écrasée par la source.
      await db.execute(
        `INSERT INTO events (
           title, description, category, dateStart, dateEnd, timeLabel, location,
           postalCode, city, organizer, isFree, price, status, isRecurring,
           source_feed_id, source_uid
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, 1, '0', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = IF(status = 'pending', VALUES(title), title),
           description = IF(status = 'pending', VALUES(description), description),
           dateStart = IF(status = 'pending', VALUES(dateStart), dateStart),
           dateEnd = IF(status = 'pending', VALUES(dateEnd), dateEnd),
           location = IF(status = 'pending', VALUES(location), location)`,
        [
          event.title, event.description, feed.default_category,
          toSql(event.start), event.end ? toSql(event.end) : null,
          event.allDay ? 'Toute la journée' : null,
          event.location, feed.postal_code, feed.organizer || feed.name,
          status, event.recurring ? 1 : 0, feed.id, event.uid,
        ]
      );
    }
    result = { ok: true, message: `${upcoming.length} événement(s) lus.`, count: upcoming.length };
  } catch (error: any) {
    const message = String(error?.message || 'Erreur inconnue').slice(0, 250);
    result = { ok: false, message, count: 0 };
  }

  await db.execute(
    `UPDATE event_feeds SET last_fetched_at = UTC_TIMESTAMP(), last_status = ?, last_message = ?, last_count = ?
     WHERE id = ?`,
    [result.ok ? 'ok' : 'error', result.message, result.count, feed.id]
  );
  return result;
}

export async function syncAllFeeds(): Promise<void> {
  const [rows] = await db.execute(
    `SELECT id, name, postal_code, feed_url, default_category, organizer, auto_approve
     FROM event_feeds WHERE is_active = 1`
  ) as any[];
  for (const feed of rows as FeedRow[]) {
    const result = await syncFeed(feed);
    console.log(JSON.stringify({ level: result.ok ? 'info' : 'warn', scope: 'event-feed', feedId: feed.id, message: result.message }));
  }
}

/** Lance la synchronisation toutes les 6 h. Désactivée par défaut : EVENT_FEED_SYNC=1 pour l'activer. */
export function startEventFeedScheduler(): void {
  if (process.env.EVENT_FEED_SYNC !== '1') return;
  const run = () => syncAllFeeds().catch(error =>
    console.error(JSON.stringify({ level: 'error', scope: 'event-feed', message: String(error?.message || error) }))
  );
  setTimeout(run, 2 * 60 * 1000);
  setInterval(run, 6 * 60 * 60 * 1000).unref();
}
