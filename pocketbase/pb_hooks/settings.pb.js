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

  // E-mail links must open the React private area, not the PocketBase admin UI.
  const frontendUrl = env('FRONTEND_URL');
  if (frontendUrl) {
    const base = frontendUrl.replace(/\/+$/, '');
    const users = e.app.findCollectionByNameOrId('users');

    users.verificationTemplate.subject = 'Confirm your e-mail for {APP_NAME}';
    users.verificationTemplate.body = [
      '<p>Hello,</p>',
      '<p>Thank you for signing up to the private area of {APP_NAME}.</p>',
      '<p>Please confirm your e-mail address by clicking the button below.</p>',
      `<p><a class="btn" href="${base}/area/verify-email?token={TOKEN}" target="_blank" rel="noopener">Confirm e-mail</a></p>`,
      "<p><i>If you didn't sign up, you can safely ignore this e-mail.</i></p>",
      '<p>With love,<br/>{APP_NAME}</p>',
    ].join('\n');

    users.resetPasswordTemplate.subject = 'Reset your {APP_NAME} password';
    users.resetPasswordTemplate.body = [
      '<p>Hello,</p>',
      '<p>Click on the button below to choose a new password.</p>',
      `<p><a class="btn" href="${base}/area/reset-password?token={TOKEN}" target="_blank" rel="noopener">Reset password</a></p>`,
      "<p><i>If you didn't ask to reset your password, you can safely ignore this e-mail.</i></p>",
      '<p>With love,<br/>{APP_NAME}</p>',
    ].join('\n');

    e.app.save(users);
  }

  console.log('[settings] configuration synced from environment');
});
