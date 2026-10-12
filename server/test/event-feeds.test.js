// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseIcal, localToUtc } = require('../dist/lib/icalParser');
const { parseFeedUrl, isPrivateAddress } = require('../dist/lib/feedUrl');

const ics = [
  'BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:abc@dour',
  'DTSTART;TZID=Europe/Brussels:20270621T180000', 'DTEND;TZID=Europe/Brussels:20270621T230000',
  'SUMMARY:Fête de la Musique', 'DESCRIPTION:Concerts\\, buvette\\nentrée libre', 'LOCATION:Place Verte', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:u2', 'DTSTART;VALUE=DATE:20270628', 'SUMMARY:Eco Day', 'RRULE:FREQ=YEARLY', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:u3', 'DTSTART:20270713T200000Z', 'SUMMARY:Feu d\'artifice', 'STATUS:CANCELLED', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:u4', 'DTSTART:20271001T100000Z', 'SUMMARY:Marché', 'DESCRIPTION:ligne longue', ' suite', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:pasunedate', 'SUMMARY:Cassé', 'END:VEVENT', 'END:VCALENDAR',
].join('\r\n');

test('le calendrier iCal est lu : fuseau, texte échappé, annulé et date invalide ignorés', () => {
  const events = parseIcal(ics);
  assert.equal(events.length, 3);
  assert.equal(events[0].start.toISOString(), '2027-06-21T16:00:00.000Z');
  assert.equal(events[0].description, 'Concerts, buvette\nentrée libre');
  assert.equal(events[1].allDay, true);
  assert.equal(events[1].recurring, true);
  assert.equal(events[2].description, 'ligne longuesuite');
  assert.equal(localToUtc(2027, 1, 15, 12, 0, 0, 'Europe/Brussels').toISOString(), '2027-01-15T11:00:00.000Z');
});

test('les adresses de flux internes ou non sécurisées sont refusées', () => {
  assert.ok(parseFeedUrl('https://www.dour.be/agenda.ics'));
  for (const bad of ['http://dour.be/a.ics', 'https://localhost/a', 'https://127.0.0.1/a',
    'https://192.168.1.2/a', 'https://u:p@dour.be/a', 'ftp://x/a', 'pas une adresse']) {
    assert.throws(() => parseFeedUrl(bad), undefined, bad);
  }
  assert.equal(isPrivateAddress('8.8.8.8'), false);
  assert.equal(isPrivateAddress('::ffff:10.0.0.1'), true);
});

test('la migration des flux ne contient aucune source préremplie', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'migrations', '019_event_feeds.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS event_feeds/i);
  assert.match(sql, /auto_approve TINYINT\(1\) NOT NULL DEFAULT 0/i);
  assert.match(sql, /UNIQUE KEY uq_events_source \(source_feed_id, source_uid\)/i);
  assert.doesNotMatch(sql, /INSERT\s+INTO/i);
});
