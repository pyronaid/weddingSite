/// <reference path="../pb_data/types.d.ts" />

/**
 * Sign-up requires the secret code given to the guests (app_settings
 * `signup_code`, editable by admins). It is sent as `secretCode` with the
 * sign-up request and never stored. An empty setting disables the check.
 * Superusers creating users from the admin UI are not affected.
 */
onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next();

  const { getSetting, normalizeCode } = require(`${__hooks}/lib/settings.js`);
  const { t } = require(`${__hooks}/lib/i18n.js`);
  const expected = normalizeCode(getSetting(e.app, 'signup_code', ''));
  const given = normalizeCode(e.requestInfo().body.secretCode);

  if (expected && given !== expected) {
    throw new BadRequestError(t(e.app, 'check_fields'), {
      secretCode: new ValidationError(
        'validation_invalid_secret_code',
        t(e.app, given ? 'secret_code_wrong' : 'secret_code_missing'),
      ),
    });
  }
  e.next();
}, 'users');
