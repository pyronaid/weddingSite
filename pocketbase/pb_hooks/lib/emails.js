/// <reference path="../../pb_data/types.d.ts" />

/**
 * The confirmation and password-reset e-mails, in the site language.
 * Applied on every start (settings.pb.js) and whenever the super admin
 * changes the language (site.pb.js). Loaded with require().
 *
 * Their links open the React private area (FRONTEND_URL), not the PocketBase
 * admin UI; without FRONTEND_URL the templates are left untouched.
 */
const { language } = require(`${__hooks}/lib/i18n.js`);

const TEMPLATES = {
  en: {
    verifySubject: 'Confirm your e-mail for {APP_NAME}',
    verify: [
      '<p>Hello,</p>',
      '<p>Thank you for signing up to the private area of {APP_NAME}.</p>',
      '<p>Please confirm your e-mail address by clicking the button below.</p>',
      '<p><a class="btn" href="{LINK}" target="_blank" rel="noopener">Confirm e-mail</a></p>',
      "<p><i>If you didn't sign up, you can safely ignore this e-mail.</i></p>",
      '<p>With love,<br/>{APP_NAME}</p>',
    ],
    resetSubject: 'Reset your {APP_NAME} password',
    reset: [
      '<p>Hello,</p>',
      '<p>Click on the button below to choose a new password.</p>',
      '<p><a class="btn" href="{LINK}" target="_blank" rel="noopener">Reset password</a></p>',
      "<p><i>If you didn't ask to reset your password, you can safely ignore this e-mail.</i></p>",
      '<p>With love,<br/>{APP_NAME}</p>',
    ],
  },
  it: {
    verifySubject: 'Conferma la tua e-mail per {APP_NAME}',
    verify: [
      '<p>Ciao,</p>',
      "<p>Grazie per la registrazione all'area riservata di {APP_NAME}.</p>",
      '<p>Conferma il tuo indirizzo e-mail cliccando il pulsante qui sotto.</p>',
      '<p><a class="btn" href="{LINK}" target="_blank" rel="noopener">Conferma e-mail</a></p>',
      '<p><i>Se non hai fatto tu la registrazione, puoi ignorare questa e-mail.</i></p>',
      '<p>Con affetto,<br/>{APP_NAME}</p>',
    ],
    resetSubject: 'Reimposta la password di {APP_NAME}',
    reset: [
      '<p>Ciao,</p>',
      '<p>Clicca il pulsante qui sotto per scegliere una nuova password.</p>',
      '<p><a class="btn" href="{LINK}" target="_blank" rel="noopener">Reimposta la password</a></p>',
      '<p><i>Se non hai chiesto di reimpostare la password, puoi ignorare questa e-mail.</i></p>',
      '<p>Con affetto,<br/>{APP_NAME}</p>',
    ],
  },
};

function applyEmailTemplates(app) {
  const frontendUrl = ($os.getenv('FRONTEND_URL') || '').trim();
  if (!frontendUrl) return;
  const base = frontendUrl.replace(/\/+$/, '');
  const texts = TEMPLATES[language(app)] || TEMPLATES.en;
  const body = (lines, link) => lines.join('\n').replace('{LINK}', link);

  const users = app.findCollectionByNameOrId('users');
  users.verificationTemplate.subject = texts.verifySubject;
  users.verificationTemplate.body = body(texts.verify, `${base}/area/verify-email?token={TOKEN}`);
  users.resetPasswordTemplate.subject = texts.resetSubject;
  users.resetPasswordTemplate.body = body(texts.reset, `${base}/area/reset-password?token={TOKEN}`);
  app.save(users);
}

module.exports = { applyEmailTemplates };
