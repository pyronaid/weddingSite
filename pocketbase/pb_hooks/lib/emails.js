/// <reference path="../../pb_data/types.d.ts" />

/**
 * The e-mails sent to the guests, as designed HTML in the site language and
 * colours: the confirmation of the address, the password reset, the change of
 * address and the one-time code. (The new-login alert is turned off: see the
 * 1760400016 migration.) Applied on every start (settings.pb.js) and whenever
 * the super admin changes the site content (site.pb.js): a new language or
 * colour palette reaches the e-mails at once. Loaded with require().
 *
 * E-mail programs ignore <style> blocks and modern CSS: the layout is tables
 * with inline styles, the button a styled link, and the link also written out
 * for programs that block it. PocketBase adds the plain-text version itself.
 *
 * Their links open the React private area (FRONTEND_URL), not the PocketBase
 * admin UI; without FRONTEND_URL the templates are left untouched.
 */
const { language } = require(`${__hooks}/lib/i18n.js`);

/** The site's default colours (src/theme/palette.ts), used where none is saved. */
const DEFAULT_COLOURS = {
  pageEdge: '#f9cfdd',
  pageLight: '#fffaf7',
  text: '#4a2537',
  accentStrong: '#c24f78',
  cardBg: '#6d3350',
  cardText: '#fff7f2',
  cardAccent: '#ffc2d6',
};

const TEXTS = {
  en: {
    eyebrow: 'Private area',
    hello: 'Hello,',
    signature: 'With love,',
    fallback: 'If the button does not work, copy this address into your browser:',
    verify: {
      subject: 'Confirm your e-mail for {APP_NAME}',
      preheader: 'One click to enter the private area of the wedding.',
      title: 'Welcome!',
      lines: [
        'Thank you for signing up to the private area of {APP_NAME}.',
        'Please confirm your e-mail address: then you can log in, play the game and find all the details of the day.',
      ],
      button: 'Confirm my e-mail',
      ignore: "If you didn't sign up, you can safely ignore this e-mail.",
    },
    reset: {
      subject: 'Reset your {APP_NAME} password',
      preheader: 'Choose a new password for the private area.',
      title: 'A new password',
      lines: [
        'Someone (hopefully you) asked to reset the password of your account.',
        'Click the button to choose a new one.',
      ],
      button: 'Choose a new password',
      ignore: "If you didn't ask to reset your password, you can safely ignore this e-mail: nothing changes.",
    },
    emailChange: {
      subject: 'Confirm your new e-mail for {APP_NAME}',
      preheader: 'Confirm the new address of your account.',
      title: 'Your new address',
      lines: ['Click the button to confirm this address as the new e-mail of your account.'],
      button: 'Confirm the new address',
      ignore: "If you didn't ask to change your e-mail, you can safely ignore this e-mail.",
    },
    otp: {
      subject: 'Your {APP_NAME} code',
      preheader: 'Your one-time code to log in.',
      title: 'Your code',
      lines: ['Type this code to log in:'],
      ignore: "If you didn't ask for it, you can safely ignore this e-mail.",
    },
  },
  it: {
    eyebrow: 'Area riservata',
    hello: 'Ciao,',
    signature: 'Con affetto,',
    fallback: 'Se il pulsante non funziona, copia questo indirizzo nel browser:',
    verify: {
      subject: 'Conferma la tua e-mail per {APP_NAME}',
      preheader: "Un clic per entrare nell'area riservata del matrimonio.",
      title: 'Benvenuto!',
      lines: [
        "Grazie per esserti registrato all'area riservata di {APP_NAME}.",
        'Conferma il tuo indirizzo e-mail: poi potrai accedere, giocare e trovare tutti i dettagli della giornata.',
      ],
      button: 'Conferma la mia e-mail',
      ignore: 'Se non hai fatto tu la registrazione, puoi ignorare questa e-mail.',
    },
    reset: {
      subject: 'Reimposta la password di {APP_NAME}',
      preheader: "Scegli una nuova password per l'area riservata.",
      title: 'Una nuova password',
      lines: [
        'Qualcuno (speriamo tu) ha chiesto di reimpostare la password del tuo account.',
        'Clicca il pulsante per sceglierne una nuova.',
      ],
      button: 'Scegli una nuova password',
      ignore: 'Se non hai chiesto di reimpostare la password, puoi ignorare questa e-mail: non cambia nulla.',
    },
    emailChange: {
      subject: 'Conferma la nuova e-mail per {APP_NAME}',
      preheader: 'Conferma il nuovo indirizzo del tuo account.',
      title: 'Il tuo nuovo indirizzo',
      lines: ['Clicca il pulsante per confermare questo indirizzo come nuova e-mail del tuo account.'],
      button: 'Conferma il nuovo indirizzo',
      ignore: "Se non hai chiesto di cambiare l'e-mail, puoi ignorare questa e-mail.",
    },
    otp: {
      subject: 'Il tuo codice per {APP_NAME}',
      preheader: 'Il tuo codice monouso per accedere.',
      title: 'Il tuo codice',
      lines: ['Inserisci questo codice per accedere:'],
      ignore: 'Se non lo hai chiesto tu, puoi ignorare questa e-mail.',
    },
  },
};

/** The site's colours (site_content.palette), checked: they go into the e-mail's styles. */
function coloursOf(app) {
  const colours = Object.assign({}, DEFAULT_COLOURS);
  try {
    const record = app.findFirstRecordByFilter('site_content', "id != ''");
    const saved = JSON.parse(record.getString('palette') || 'null') || {};
    for (const key of Object.keys(colours)) {
      if (typeof saved[key] === 'string' && /^#[0-9a-f]{6}$/i.test(saved[key])) colours[key] = saved[key];
    }
  } catch {
    // No content or no palette yet: the default colours.
  }
  return colours;
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SCRIPT = "'Great Vibes', 'Brush Script MT', 'Segoe Script', cursive";

/**
 * One e-mail: a header with the couple's names, the message, a button (or a
 * code), the link written out, and the footer. `{APP_NAME}` and the
 * PocketBase placeholders in `action` are filled in by PocketBase.
 */
function layout(c, texts, mail, action) {
  const paragraph = (text) =>
    `<p style="margin:0 0 14px;font-family:${SERIF};font-size:17px;line-height:1.6;color:${c.text};">${text}</p>`;
  const main =
    action.kind === 'link'
      ? `<tr><td align="center" style="padding:10px 32px 26px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="${c.cardBg}" style="border-radius:999px;background:${c.cardBg};">
              <a href="${action.href}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 34px;border-radius:999px;font-family:${SANS};font-size:16px;font-weight:bold;letter-spacing:0.5px;color:${c.cardText};text-decoration:none;">${mail.button}</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 32px 24px;font-family:${SANS};font-size:13px;line-height:1.5;color:${c.text};">
          ${texts.fallback}<br/>
          <a href="${action.href}" target="_blank" rel="noopener" style="color:${c.accentStrong};word-break:break-all;">${action.href}</a>
        </td></tr>`
      : `<tr><td align="center" style="padding:6px 32px 26px;">
          <div style="display:inline-block;padding:14px 28px;border-radius:14px;background:${c.pageEdge};font-family:${SANS};font-size:32px;font-weight:bold;letter-spacing:8px;color:${c.text};">${action.code}</div>
        </td></tr>`;

  return `<div style="margin:0;padding:0;background:${c.pageEdge};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${mail.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.pageEdge}" style="background:${c.pageEdge};">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${c.pageLight};border-radius:20px;overflow:hidden;">
        <tr><td align="center" bgcolor="${c.cardBg}" style="background:${c.cardBg};padding:30px 24px 26px;">
          <div style="font-family:${SANS};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${c.cardAccent};">${texts.eyebrow}</div>
          <div style="margin-top:6px;font-family:${SCRIPT};font-size:40px;line-height:1.15;color:${c.cardText};">{APP_NAME}</div>
          <div style="margin-top:8px;font-size:18px;line-height:1;color:${c.cardAccent};">&#10086;</div>
        </td></tr>
        <tr><td style="padding:32px 32px 6px;">
          <h1 style="margin:0 0 16px;font-family:${SERIF};font-size:26px;font-weight:normal;line-height:1.3;color:${c.accentStrong};">${mail.title}</h1>
          ${paragraph(texts.hello)}
          ${mail.lines.map(paragraph).join('\n          ')}
        </td></tr>
        ${main}
        <tr><td style="padding:20px 32px 30px;border-top:1px solid ${c.pageEdge};">
          <p style="margin:0 0 14px;font-family:${SANS};font-size:13px;line-height:1.5;font-style:italic;color:${c.text};">${mail.ignore}</p>
          <p style="margin:0;font-family:${SERIF};font-size:16px;line-height:1.5;color:${c.text};">${texts.signature}<br/><span style="font-family:${SCRIPT};font-size:24px;color:${c.accentStrong};">{APP_NAME}</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

function applyEmailTemplates(app) {
  const frontendUrl = ($os.getenv('FRONTEND_URL') || '').trim();
  if (!frontendUrl) return;
  const base = frontendUrl.replace(/\/+$/, '');
  const texts = TEXTS[language(app)] || TEXTS.en;
  const colours = coloursOf(app);
  const link = (href) => ({ kind: 'link', href });

  const users = app.findCollectionByNameOrId('users');
  users.verificationTemplate.subject = texts.verify.subject;
  users.verificationTemplate.body = layout(
    colours,
    texts,
    texts.verify,
    link(`${base}/area/verify-email?token={TOKEN}`),
  );
  users.resetPasswordTemplate.subject = texts.reset.subject;
  users.resetPasswordTemplate.body = layout(
    colours,
    texts,
    texts.reset,
    link(`${base}/area/reset-password?token={TOKEN}`),
  );
  // The site has no page for these two (only the admin UI can start them): PocketBase's own links and code.
  users.confirmEmailChangeTemplate.subject = texts.emailChange.subject;
  users.confirmEmailChangeTemplate.body = layout(
    colours,
    texts,
    texts.emailChange,
    link('{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}'),
  );
  users.otp.emailTemplate.subject = texts.otp.subject;
  users.otp.emailTemplate.body = layout(colours, texts, texts.otp, { kind: 'code', code: '{OTP}' });
  app.save(users);
}

module.exports = { applyEmailTemplates };
