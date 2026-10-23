/// <reference path="../pb_data/types.d.ts" />

/**
 * Syncs app settings from environment variables on every start, so the
 * configuration lives in docker-compose / your hosting platform instead of
 * being clicked together in the admin UI. Unset variables are left untouched.
 *
 * NOTE: JSVM handlers run in isolated runtimes, so all helpers must live
 * inside the handler (top-level variables are not shared).
 */
onBootstrap((e) => {
  e.next();

  const env = (name) => {
    const value = $os.getenv(name);
    return value && value.trim() !== '' ? value.trim() : null;
  };

  const settings = e.app.settings();

  const appName = env('PB_APP_NAME');
  if (appName) settings.meta.appName = appName;
  const appUrl = env('PB_APP_URL');
  if (appUrl) settings.meta.appURL = appUrl;
  const senderName = env('PB_SENDER_NAME');
  if (senderName) settings.meta.senderName = senderName;
  const senderAddress = env('PB_SENDER_ADDRESS');
  if (senderAddress) settings.meta.senderAddress = senderAddress;

  const smtpHost = env('PB_SMTP_HOST');
  if (smtpHost) {
    settings.smtp.enabled = true;
    settings.smtp.host = smtpHost;
    settings.smtp.port = parseInt(env('PB_SMTP_PORT') || '587', 10);
    settings.smtp.username = env('PB_SMTP_USERNAME') || '';
    settings.smtp.password = env('PB_SMTP_PASSWORD') || '';
    settings.smtp.tls = env('PB_SMTP_TLS') === 'true';
  }

  // Built-in rate limiter (defaults: 2 auth attempts / 3s, 20 creates / 5s per IP).
  settings.rateLimits.enabled = env('PB_RATE_LIMIT') !== 'false';

  e.app.save(settings);

  // E-mail links must open the React private area, not the PocketBase admin
  // UI; the texts follow the site language (see lib/emails.js).
  const { applyEmailTemplates } = require(`${__hooks}/lib/emails.js`);
  applyEmailTemplates(e.app);

  console.log('[settings] configuration synced from environment');
});
