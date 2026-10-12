// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Lecture d'un calendrier iCalendar (.ics) : extrait les événements à venir.
// Volontairement sans dépendance. Les événements récurrents (RRULE) ne sont importés
// que pour leur première occurrence, signalée par `recurring`.

export interface IcalEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  recurring: boolean;
}

const TIME_ZONE = 'Europe/Brussels';

/** Décalage (ms) de `timeZone` par rapport à UTC à l'instant `utcMs`. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Heure locale `timeZone` -> instant UTC. */
export function localToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let utc = guess - zoneOffsetMs(guess, timeZone);
  utc = guess - zoneOffsetMs(utc, timeZone); // 2e passe : autour des changements d'heure
  return new Date(utc);
}

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

interface Prop { name: string; params: Record<string, string>; value: string }

function parseLine(line: string): Prop | null {
  const colon = line.indexOf(':');
  if (colon <= 0) return null;
  const [name, ...paramParts] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function parseDate(prop: Prop): { date: Date; allDay: boolean } | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(prop.value.trim());
  if (!match) return null;
  const [y, mo, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const hasTime = match[4] !== undefined;
  const h = Number(match[4] || 0);
  const mi = Number(match[5] || 0);
  const s = Number(match[6] || 0);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  if (hasTime && match[7] === 'Z') return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)), allDay: false };
  let zone = TIME_ZONE;
  const tzid = prop.params.TZID;
  if (tzid) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tzid }); zone = tzid; } catch { zone = TIME_ZONE; }
  }
  const date = localToUtc(y, mo, d, h, mi, s, zone);
  return Number.isNaN(date.getTime()) ? null : { date, allDay: !hasTime || prop.params.VALUE === 'DATE' };
}

export function parseIcal(text: string, maxEvents = 500): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Record<string, Prop> | null = null;

  for (const line of unfold(text)) {
    const upper = line.trim().toUpperCase();
    if (upper === 'BEGIN:VEVENT') { current = {}; continue; }
    if (upper === 'END:VEVENT') {
      if (current) {
        const startProp = current.DTSTART;
        const start = startProp ? parseDate(startProp) : null;
        const status = (current.STATUS?.value || '').trim().toUpperCase();
        const title = unescapeText(current.SUMMARY?.value || '').slice(0, 160);
        if (start && title && status !== 'CANCELLED') {
          const end = current.DTEND ? parseDate(current.DTEND) : null;
          const uidRaw = (current.UID?.value || '').trim();
          events.push({
            uid: (uidRaw || `${title}|${start.date.toISOString()}`).slice(0, 190),
            title,
            description: unescapeText(current.DESCRIPTION?.value || '').slice(0, 5000),
            location: unescapeText(current.LOCATION?.value || '').slice(0, 160),
            start: start.date,
            end: end && end.date.getTime() >= start.date.getTime() ? end.date : null,
            allDay: start.allDay,
            recurring: Boolean(current.RRULE),
          });
          if (events.length >= maxEvents) break;
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const prop = parseLine(line);
    // On garde la première occurrence de chaque propriété.
    if (prop && !(prop.name in current)) current[prop.name] = prop;
  }
  return events;
}
