// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Test de bout en bout de l'API VilleConnect, sur une base MySQL JETABLE (jamais la production :
// le script modifie directement des comptes en base).
// Usage : API=http://localhost:3000 E2E_MYSQL="mysql -h127.0.0.1 -uroot -proot villeconnect" node test-e2e/e2e.mjs
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const API = process.env.API || 'http://localhost:3000';
const MYSQL = process.env.E2E_MYSQL || 'mysql -uroot villeconnect';
const sql = q => execSync(`${MYSQL} --default-character-set=utf8mb4 -N -e ${JSON.stringify(q)}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
const results = [];
const ok = (name, cond, info = '') => { results.push([cond ? 'OK  ' : 'FAIL', name, info]); };

async function call(kind, path, input, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const url = kind === 'q'
    ? `${API}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input ?? {}))}`
    : `${API}/api/trpc/${path}`;
  const res = await fetch(url, kind === 'q' ? { headers } : { method: 'POST', headers, body: JSON.stringify(input ?? {}) });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json?.result?.data, error: json?.error?.message || json?.error?.json?.message };
}
const q = (p, i, t) => call('q', p, i, t);
const m = (p, i, t) => call('m', p, i, t);

const stamp = Date.now();
const citizen = `citoyen${stamp}@test.local`, merchant = `commerce${stamp}@test.local`, admin = `admin${stamp}@test.local`;
const moderator = `commune${stamp}@test.local`;
const pwd = 'MotDePasse!Solide2026';

// 1. Santé
const h = await fetch(`${API}/health`).then(r => r.json());
ok('GET /health', h.ok === true, h.version);
const ready = await fetch(`${API}/ready`);
ok('GET /ready (base joignable)', ready.status === 200, String(ready.status));
const batch = await fetch(`${API}/api/trpc/events.list,events.list?batch=1&input=${encodeURIComponent('{"0":{},"1":{}}')}`);
ok('Requêtes groupées (batch) refusées', batch.status >= 400, String(batch.status));

// 2. Comptes
for (const e of [citizen, merchant, admin, moderator]) {
  const r = await m('auth.register', { email: e, password: pwd, postalCode: '7370', city: 'Dour' });
  ok(`auth.register ${e.split('@')[0]}`, r.status === 200, r.error || '');
}
// Vérification email simulée (pas de Resend en local) + rôles
sql(`UPDATE users SET email_verified_at = NOW() WHERE email IN ('${citizen}','${merchant}','${admin}','${moderator}')`);
sql(`UPDATE users SET role='admin' WHERE email='${admin}'`);

const login = async e => (await m('auth.login', { email: e, password: pwd })).data;
const lc = await login(citizen), la = await login(admin);
ok('auth.login citoyen', !!lc?.accessToken);
ok('auth.login admin', la?.user?.role === 'admin');
const bad = await m('auth.login', { email: citizen, password: 'mauvais-mot-de-passe' });
ok('auth.login mauvais mot de passe refusé', bad.status === 401, bad.error);
const me = await q('auth.me', {}, lc.accessToken);
ok('auth.me', me.data?.email === citizen);
const rf = await m('auth.refresh', { refreshToken: lc.refreshToken });
ok('auth.refresh', !!rf.data?.accessToken, rf.error || '');

// 3. Ville et liens
const city = await q('city.getByPostalCode', { postal_code: '7370' });
ok('city.getByPostalCode 7370', !!city.data, city.error || JSON.stringify(city.data).slice(0, 60));
const links = await q('city.getServiceLinks', { postal_code: '7370' });
ok('city.getServiceLinks', links.status === 200, links.error || '');

// 4. Formulaires publics (site vitrine)
const wl = await m('waitlist.join', { email: `wl${stamp}@test.local`, postal_code: '7370', role: 'citoyen', privacyConsent: true });
ok('waitlist.join (landing)', wl.status === 200, wl.error || '');
const cs = await m('commerce.submit', { name: `Boulangerie Test ${stamp}`, address: 'Grand-Place 1', postalCode: '7370', city: 'Dour', consentPublication: true, privacyConsent: true });
ok('commerce.submit (portail commerce)', cs.status === 200, cs.error || '');
const ev = await m('events.submit', { title: 'Marché test', description: 'Un marché de test pour la vérification', dateStart: new Date(Date.now() + 864e5 * 7).toISOString(), location: 'Grand-Place', postalCode: '7370', organizer: 'ASBL Test', organizerEmail: 'asbl@test.local', privacyConsent: true });
ok('events.submit (portail événements)', ev.status === 200, ev.error || '');

// 5. Modération admin
const commerceId = Number(sql(`SELECT id FROM commerce_catalog WHERE name='Boulangerie Test ${stamp}'`));
const rv = await m('commerce.review', { id: String(commerceId), action: 'approve', publish: true }, la.accessToken);
ok('commerce.review approve+publish (admin)', rv.status === 200, rv.error || '');
const pub = await q('commerce.listPublished', { postalCode: '7370' });
ok('commerce.listPublished contient le commerce', JSON.stringify(pub.data).includes(`Boulangerie Test ${stamp}`));
const forbidden = await m('commerce.review', { id: String(commerceId), action: 'approve' }, lc.accessToken);
ok('commerce.review refusé au citoyen', forbidden.status === 403, forbidden.error);
const pend = await q('events.pending', {}, la.accessToken);
ok('events.pending (admin)', pend.status === 200, pend.error || '');
const evId = Number(sql(`SELECT id FROM events ORDER BY id DESC LIMIT 1`));
const ap = await m('events.approve', { id: evId }, la.accessToken);
ok('events.approve', ap.status === 200, ap.error || '');
const evl = await q('events.list', { postalCode: '7370' });
ok('events.list contient l’événement', JSON.stringify(evl.data).includes('Marché test'), evl.error || '');

// 5 bis. Cloisonnement par commune
const grant = await m('cityAdmins.grant', { email: moderator, postalCode: '7370' }, la.accessToken);
ok('cityAdmins.grant (Dour → modérateur)', grant.status === 200, grant.error || '');
const lmod = await login(moderator);
ok('modérateur connecté avec le rôle city_admin', lmod?.user?.role === 'city_admin', lmod?.user?.role);
const notMine = await q('events.pending', { postalCode: '7000' }, lmod.accessToken);
ok('city_admin de Dour refusé sur Mons (7000)', notMine.status === 403, notMine.error);
const mine = await q('events.pending', { postalCode: '7370' }, lmod.accessToken);
ok('city_admin de Dour autorisé sur Dour', mine.status === 200, mine.error || '');
await m('events.submit', { title: 'Brocante Mons', description: 'Un événement d’une autre commune', dateStart: new Date(Date.now() + 864e5 * 9).toISOString(), location: 'Grand-Place', postalCode: '7000', organizer: 'ASBL Mons', organizerEmail: 'mons@test.local', privacyConsent: true });
const monsId = Number(sql(`SELECT id FROM events WHERE postalCode='7000' ORDER BY id DESC LIMIT 1`));
const crossApprove = await m('events.approve', { id: monsId }, lmod.accessToken);
ok('city_admin de Dour ne peut pas valider un événement de Mons', crossApprove.status === 403, crossApprove.error);
const sportCross = await m('sport.adminUpsert', { postalCode: '7000', kind: 'club', name: 'Club Mons', sports: ['Football'] }, lmod.accessToken);
ok('city_admin de Dour ne peut pas publier une fiche Sport à Mons', sportCross.status === 403, sportCross.error || String(sportCross.status));
const revoke = await m('cityAdmins.revoke', { email: moderator, postalCode: '7370' }, la.accessToken);
ok('cityAdmins.revoke', revoke.status === 200, revoke.error || '');
const afterRevoke = await q('events.pending', { postalCode: '7370' }, lmod.accessToken);
ok('droit retiré : effet immédiat', afterRevoke.status === 403, afterRevoke.error);

// 6. Espace commerçant
const link = await m('merchant.adminLinkMember', { commerceId, userEmail: merchant }, la.accessToken);
ok('merchant.adminLinkMember', link.status === 200, link.error || '');
const lm = await login(merchant);
ok('login commerçant (rôle merchant)', lm?.user?.role === 'merchant', lm?.user?.role);
const mc = await q('merchant.myCommerces', {}, lm.accessToken);
ok('merchant.myCommerces', mc.data?.some?.(c => c.id === commerceId));
const ps = await m('merchant.productSave', { commerceId, name: 'Pain de campagne', priceCents: 1250, stock: 10 }, lm.accessToken);
ok('merchant.productSave', ps.status === 200, ps.error || '');
const cat = await q('orders.catalog', { commerceId });
ok('orders.catalog', cat.status === 200 && JSON.stringify(cat.data).includes('Pain'), cat.error || '');
const productId = Number(sql(`SELECT id FROM products WHERE commerce_id=${commerceId} LIMIT 1`));

// 7. Commande (Stripe non relié → doit échouer proprement)
const oc = await m('orders.create', { commerceId, items: [{ productId, quantity: 1 }] }, lc.accessToken);
ok('orders.create sans Stripe : refus propre', oc.status >= 400 && oc.status < 500, `${oc.status} ${oc.error}`);
const om = await q('orders.mine', {}, lc.accessToken);
ok('orders.mine', om.status === 200, om.error || '');

// 8. Webhook Stripe : signature invalide refusée
const wh = await fetch(`${API}/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=00' }, body: '{}' });
ok('webhook Stripe signature invalide refusée', wh.status === 400 || wh.status === 503, String(wh.status));
if (process.env.STRIPE_WEBHOOK_SECRET) {
  const body = JSON.stringify({ id: 'evt_test', type: 'account.updated', data: { object: { id: 'acct_inconnu', charges_enabled: false } } });
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  const wh2 = await fetch(`${API}/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${sig}` }, body });
  ok('webhook Stripe signature valide acceptée', wh2.status === 200, String(wh2.status));
}

// 9. Carburants, sport, confidentialité
const fuel = await q('fuel.getStations', { postalCode: '7370' });
ok('fuel.getStations', fuel.status === 200, fuel.error || `${fuel.data?.length ?? JSON.stringify(fuel.data).slice(0, 40)}`);
const sp = await q('sport.overview', { postalCode: '7370' });
ok('sport.overview', sp.status === 200, sp.error || '');
const ex = await m('privacy.exportMyData', {}, lc.accessToken);
ok('privacy.exportMyData (RGPD)', ex.status === 200, ex.error || '');

// 10. Compte désactivé : la session ne peut plus être renouvelée
const lcit2 = await login(citizen);
sql(`UPDATE users SET is_active = 0 WHERE email='${citizen}'`);
const rf2 = await m('auth.refresh', { refreshToken: lcit2.refreshToken });
ok('compte désactivé : renouvellement de session refusé', rf2.status === 401, rf2.error);
sql(`UPDATE users SET is_active = 1 WHERE email='${citizen}'`);

// 11. CORS
const cors = await fetch(`${API}/health`, { headers: { origin: 'https://site-pirate.example' } });
ok('CORS : origine inconnue refusée (403)', cors.status === 403, String(cors.status));
const cors2 = await fetch(`${API}/health`, { headers: { origin: 'https://app.villeconnectos.com' } });
ok('CORS : app.villeconnectos.com autorisée', cors2.headers.get('access-control-allow-origin') === 'https://app.villeconnectos.com');

for (const [s, n, i] of results) console.log(`${s} ${n}${i ? '  — ' + i : ''}`);
const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - fails}/${results.length} vérifications réussies`);
process.exit(fails ? 1 : 0);
