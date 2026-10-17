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
  const expected = normalizeCode(getSetting(e.app, 'signup_code', ''));
  const given = normalizeCode(e.requestInfo().body.secretCode);

  if (expected && given !== expected) {
    throw new BadRequestError('Please check the highlighted fields.', {
      secretCode: new ValidationError(
        'validation_invalid_secret_code',
        given ? 'This secret code is not correct.' : 'Please enter the secret code.',
      ),
    });
  }
  e.next();
}, 'users');
