import { isIP } from 'net';

export const PASSWORD_RESET_TTL_MINUTES = 30;
const DEFAULT_ORIGIN = 'https://app.villeconnectos.com';
const URL_ERROR = 'WEB_APP_URL doit être une origine publique HTTPS absolue, sans chemin, identifiants, paramètres ni fragment';

/** Never include the rejected value: configuration may accidentally contain a secret. */
export function webAppOrigin(env: Record<string, string | undefined> = process.env): string {
  const raw = env.WEB_APP_URL?.trim();
  if (!raw && env.NODE_ENV === 'production') throw new Error(URL_ERROR);
  const value = raw || DEFAULT_ORIGIN;
  if (!/^https?:\/\//i.test(value) || /[\s\\]/.test(value)) throw new Error(URL_ERROR);
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(URL_ERROR); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const localDev = env.NODE_ENV !== 'production' && loopback;
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || (url.protocol !== 'https:' && !(localDev && url.protocol === 'http:'))
    || (!localDev && (loopback || isIP(url.hostname.replace(/[\[\]]/g, '')) !== 0
      || !url.hostname.includes('.') || /\.(localhost|local|internal|test|invalid)$/.test(url.hostname)))) {
    throw new Error(URL_ERROR);
  }
  return url.origin;
}

export function authLink(path: '/reset-password' | '/verify-email', token: string,
  env: Record<string, string | undefined> = process.env): string {
  if (!token) throw new Error('Token email absent');
  const url = new URL(path, webAppOrigin(env));
  url.searchParams.set('token', token);
  return url.href;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export interface AuthEmail { subject: string; html: string; text: string }

export function passwordResetEmail(token: string,
  env: Record<string, string | undefined> = process.env): AuthEmail {
  const link = authLink('/reset-password', token, env);
  const href = escapeHtml(link);
  const subject = 'Réinitialisation de votre mot de passe — VilleConnect OS';
  const expiry = `Ce lien expire dans ${PASSWORD_RESET_TTL_MINUTES} minutes.`;
  const safety = "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.";
  const font = "font-family:Poppins,Arial,Helvetica,sans-serif;";
  const body = `${font}font-size:16px;line-height:26px;color:#0A2D5E;`;
  // Canonical logo/palette: docs/brand/brand.manifest.json. No remote font dependency.
  const html = `<!DOCTYPE html>
<html lang="fr" dir="ltr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="referrer" content="no-referrer"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#060B18;${body}">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;${body}">Choisissez un nouveau mot de passe. ${expiry}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#060B18" style="background-color:#060B18;"><tr><td align="center" style="padding-top:24px;padding-bottom:24px;padding-left:12px;padding-right:12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td align="center" bgcolor="#0B1330" style="background-color:#0B1330;padding-top:24px;padding-bottom:24px;border-top:3px solid #00E5FF;">
<img src="https://villeconnectos.com/brand/logo-villeconnect-official.png" width="100" height="100" border="0" alt="VilleConnect OS" style="display:block;width:100px;height:100px;border:0;">
<p style="${font}font-size:14px;line-height:22px;color:#FFFFFF;margin-top:16px;margin-bottom:0;">Un seul système. Toutes les villes.</p></td></tr>
<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding-top:28px;padding-bottom:28px;padding-left:24px;padding-right:24px;">
<h1 style="${font}font-size:26px;line-height:34px;color:#0A2D5E;margin-top:0;margin-bottom:16px;">Réinitialiser votre mot de passe</h1>
<p style="${body}margin-top:0;margin-bottom:24px;">Une demande de réinitialisation a été effectuée. Cliquez ci-dessous pour choisir un nouveau mot de passe.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#0047FF" style="background-color:#0047FF;border-radius:12px;mso-padding-alt:16px 8px;">
<a href="${href}" style="${font}font-size:16px;line-height:24px;font-weight:700;color:#FFFFFF;text-decoration:none;display:block;padding-top:16px;padding-bottom:16px;padding-left:8px;padding-right:8px;border-radius:12px;mso-text-raise:4pt;">Réinitialiser mon mot de passe</a>
</td></tr></table>
<p style="${body}margin-top:20px;margin-bottom:20px;"><strong>${expiry}</strong></p>
<p style="${body}margin-top:0;margin-bottom:8px;">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :</p>
<p style="${body}margin-top:0;margin-bottom:24px;word-break:break-all;overflow-wrap:anywhere;"><a href="${href}" style="${font}font-size:14px;line-height:24px;color:#0047FF;text-decoration:underline;word-break:break-all;">${href}</a></p>
<p style="${body}margin-top:0;margin-bottom:0;">${safety}</p>
</td></tr>
<tr><td align="center" bgcolor="#0B1330" style="background-color:#0B1330;padding-top:20px;padding-bottom:20px;padding-left:24px;padding-right:24px;"><p style="${font}font-size:14px;line-height:22px;color:#AEB6C1;margin-top:0;margin-bottom:0;">VilleConnect OS · Sécurité de votre compte<br>Ne partagez pas ce lien.</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  return { subject, html, text: `${subject}\n\nUne demande de réinitialisation a été effectuée.\n\nRéinitialiser mon mot de passe :\n${link}\n\n${expiry}\n\n${safety}\n\nVilleConnect OS — Ne partagez pas ce lien.` };
}

/** Errors are categorical: provider responses and exceptions may echo tokens or recipients. */
export async function sendAuthEmail(to: string, message: AuthEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.error('[email] configuration Resend absente'); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'VilleConnect OS <noreply@villeconnectos.com>', to: [to], ...message }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.error('[email] échec envoi HTTP', res.status); return false; }
    return true;
  } catch { console.error('[email] erreur réseau'); return false; }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  try { return await sendAuthEmail(to, passwordResetEmail(token)); }
  catch { console.error('[email] configuration du lien invalide'); return false; }
}
