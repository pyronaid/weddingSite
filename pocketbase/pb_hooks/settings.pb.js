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
  // IPs the limits do not apply to, e.g. the venue's Wi-Fi on the wedding day,
  // where every guest shares one public IP. Unset: left as it is.
  const excludedIps = env('PB_RATE_LIMIT_EXCLUDED_IPS');
  if (excludedIps !== null) {
    settings.rateLimits.excludedIPs = excludedIps === '-' ? [] : excludedIps.split(',').map((ip) => ip.trim()).filter(Boolean);
  }

  // Behind a reverse proxy (Caddy in production) every request comes from the
  // proxy: read the guest's real IP from its header instead, or the rate
  // limiter would treat all the guests as one. Only set this when PocketBase
  // is reachable through the proxy alone (it overwrites the header).
  const proxyHeaders = env('PB_TRUSTED_PROXY_HEADERS');
  if (proxyHeaders) {
    settings.trustedProxy.headers = proxyHeaders.split(',').map((header) => header.trim()).filter(Boolean);
    // The right-most value is the one added by our proxy: it cannot be spoofed.
    settings.trustedProxy.useLeftmostIP = false;
  }

  e.app.save(settings);

  // E-mail links must open the React private area, not the PocketBase admin
  // UI; the texts follow the site language (see lib/emails.js).
  const { applyEmailTemplates } = require(`${__hooks}/lib/emails.js`);
  applyEmailTemplates(e.app);

  console.log('[settings] configuration synced from environment');
});
