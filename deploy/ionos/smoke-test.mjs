// VilleConnect OS — vérification rapide d'une API en ligne, sans rien écrire en base.
// Usage : node deploy/ionos/smoke-test.mjs https://api.villeconnectos.com
// À lancer sur l'ancienne API (Railway) puis sur la nouvelle (IONOS) : les résultats doivent être identiques.
const API = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const results = [];
const check = (name, ok, info = '') => results.push({ name, ok, info });

async function query(path, input = {}) {
  const res = await fetch(`${API}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`);
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json?.result?.data, error: json?.error?.message };
}
const count = data => Array.isArray(data) ? data.length : Array.isArray(data?.items) ? data.items.length : '?';

try {
  const health = await fetch(`${API}/health`).then(r => r.json());
  check('GET /health', health.ok === true, `version ${health.version}`);
} catch (e) {
  check('GET /health', false, e.message);
}

const city = await query('city.getByPostalCode', { postal_code: '7370' });
check('Ville de Dour (city.getByPostalCode)', city.data?.found === true, city.error || city.data?.name);

const links = await query('city.getServiceLinks', { postal_code: '7370' });
check('Liens communaux', links.status === 200, links.error || `${count(links.data)} lien(s)`);

const shops = await query('commerce.listPublished', { postalCode: '7370' });
check('Annuaire des commerces', shops.status === 200, shops.error || `${count(shops.data)} commerce(s)`);

const events = await query('events.list', { postalCode: '7370' });
check('Agenda', events.status === 200, events.error || `${count(events.data)} événement(s)`);

const fuel = await query('fuel.getStations', { postalCode: '7370' });
check('Carburants', fuel.status === 200, fuel.error || `${count(fuel.data)} station(s)`);

const sport = await query('sport.overview', { postalCode: '7370' });
check('Rubrique Sport', sport.status === 200, sport.error || '');

const me = await query('auth.me');
check('Route protégée refusée sans session', me.status === 401, String(me.status));

const webhook = await fetch(`${API}/webhooks/stripe`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=00' },
  body: '{}',
});
check('Webhook Stripe : fausse signature refusée', webhook.status === 400, `${webhook.status} (503 = Stripe non configuré)`);

const allowed = await fetch(`${API}/health`, { headers: { origin: 'https://app.villeconnectos.com' } });
check('CORS : app.villeconnectos.com autorisée',
  allowed.headers.get('access-control-allow-origin') === 'https://app.villeconnectos.com');

const denied = await fetch(`${API}/health`, { headers: { origin: 'https://exemple-inconnu.test' } });
check('CORS : origine inconnue refusée', denied.status === 403, String(denied.status));

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'ÉCHEC'} ${r.name}${r.info ? ' — ' + r.info : ''}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${API} : ${results.length - failed}/${results.length} vérifications réussies`);
process.exit(failed ? 1 : 0);
