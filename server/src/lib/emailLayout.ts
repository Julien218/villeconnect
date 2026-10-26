// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Mise en page unique de tous les e-mails VilleConnect OS (ADN de marque : bleu nuit, bleu électrique, cyan).
// Tableaux et styles en ligne : c'est ce que Gmail, Outlook et Apple Mail affichent de façon fiable.
// Chaque bouton est doublé d'un lien en clair, cliquable ou copiable, pour les messageries qui bloquent les boutons.

const BRAND = {
  night: '#000317',
  navy: '#0B1B33',
  blue: '#0060FF',
  cyan: '#00E5FF',
  text: '#1B2A41',
  muted: '#5B6B82',
  line: '#E3E9F2',
  page: '#F2F5FA',
};

const SITE_URL = 'https://villeconnectos.com';
const LOGO_URL = `${SITE_URL}/brand/logo-256.png`;

export interface EmailContent {
  /** Texte d'aperçu affiché par la messagerie à côté du sujet. */
  preheader: string;
  title: string;
  /** Paragraphes en texte brut (ils sont échappés). */
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Petite note sous le bouton (expiration, sécurité…). */
  note?: string;
  /** Pourquoi la personne reçoit cet e-mail (pied de page). */
  reason: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** N'accepte que des liens http(s) : un lien mal formé ne doit jamais partir dans un e-mail. */
function safeUrl(url: string): string {
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(url)) throw new Error('Lien d’e-mail invalide');
  return url;
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const font = "Manrope,'Segoe UI',Arial,Helvetica,sans-serif";
  const paragraphs = content.paragraphs
    .map(p => `<p style="margin:0 0 16px;font-family:${font};font-size:16px;line-height:1.6;color:${BRAND.text};">${escapeHtml(p)}</p>`)
    .join('');

  let buttonBlock = '';
  if (content.button) {
    const url = safeUrl(content.button.url);
    const href = escapeHtml(url);
    buttonBlock = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
        <tr><td align="center" bgcolor="${BRAND.blue}" style="border-radius:12px;background:${BRAND.blue};background-image:linear-gradient(100deg,${BRAND.blue},#00B8FF);">
          <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">${escapeHtml(content.button.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 6px;font-family:${font};font-size:13px;line-height:1.5;color:${BRAND.muted};">Le bouton ne fonctionne pas&nbsp;? Ouvrez ce lien&nbsp;:</p>
      <p style="margin:0 0 20px;font-family:${font};font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" target="_blank" style="color:${BRAND.blue};text-decoration:underline;">${href}</a></p>`;
  }

  const note = content.note
    ? `<p style="margin:0;padding:14px 16px;background:${BRAND.page};border-radius:10px;font-family:${font};font-size:13px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(content.note)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.page};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid ${BRAND.line};">
      <tr><td align="center" bgcolor="${BRAND.night}" style="background:${BRAND.night};padding:28px 24px 22px;">
        <a href="${SITE_URL}" target="_blank" style="text-decoration:none;">
          <img src="${LOGO_URL}" width="132" height="132" alt="VilleConnect OS" style="display:block;border:0;width:132px;height:132px;">
        </a>
      </td></tr>
      <tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.blue};background-image:linear-gradient(90deg,${BRAND.blue},${BRAND.cyan});">&nbsp;</td></tr>
      <tr><td style="padding:32px 32px 28px;">
        <h1 style="margin:0 0 18px;font-family:${font};font-size:24px;line-height:1.25;font-weight:800;color:${BRAND.navy};">${escapeHtml(content.title)}</h1>
        ${paragraphs}
        ${buttonBlock}
        ${note}
      </td></tr>
      <tr><td style="padding:22px 32px 28px;background:${BRAND.night};">
        <p style="margin:0 0 8px;font-family:${font};font-size:13px;line-height:1.5;color:#C9D6EA;font-weight:700;">VilleConnect OS — un seul système, toutes les villes.</p>
        <p style="margin:0 0 10px;font-family:${font};font-size:12px;line-height:1.6;color:#8FA0BA;">${escapeHtml(content.reason)}</p>
        <p style="margin:0;font-family:${font};font-size:11px;line-height:1.6;color:#6F819D;">
          Js-Innov.IA — Julien Pagin · 52 rue Grande, 7370 Dour, Belgique · TVA BE 0877.926.214<br>
          <a href="${SITE_URL}/confidentialite" target="_blank" style="color:${BRAND.cyan};text-decoration:none;">Confidentialité</a> ·
          <a href="${SITE_URL}/mentions-legales" target="_blank" style="color:${BRAND.cyan};text-decoration:none;">Mentions légales</a> ·
          <a href="mailto:contact@villeconnectos.com" style="color:${BRAND.cyan};text-decoration:none;">contact@villeconnectos.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    content.title,
    '',
    ...content.paragraphs.flatMap(p => [p, '']),
    ...(content.button ? [`${content.button.label} : ${safeUrl(content.button.url)}`, ''] : []),
    ...(content.note ? [content.note, ''] : []),
    '—',
    'VilleConnect OS — Js-Innov.IA, 52 rue Grande, 7370 Dour, Belgique — TVA BE 0877.926.214',
    content.reason,
    `Confidentialité : ${SITE_URL}/confidentialite`,
  ].join('\n');

  return { html, text };
}
