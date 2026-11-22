/// <reference path="../pb_data/types.d.ts" />

/**
 * Sign-up requires a secret code, sent as `secretCode` with the sign-up
 * request and never stored:
 * - the guests' code (app_settings `signup_code`): an ordinary account. An
 *   empty setting disables the check;
 * - the super-admin code (`superadmin_signup_code`, empty: closed): the new
 *   account is a super admin. It is set here, on the record: the users'
 *   createRule still refuses `is_superadmin` in the request itself. The
 *   account works only once its e-mail is confirmed (authRule), and every
 *   one is written to the log.
 * Both are editable by super admins (Site settings → Sign-up code).
 * Superusers creating users from the admin UI are not affected.
 */
onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next();

  const { getSetting, normalizeCode } = require(`${__hooks}/lib/settings.js`);
  const { t } = require(`${__hooks}/lib/i18n.js`);
  const expected = normalizeCode(getSetting(e.app, 'signup_code', ''));
  const superAdmin = normalizeCode(getSetting(e.app, 'superadmin_signup_code', ''));
  const given = normalizeCode(e.requestInfo().body.secretCode);

  if (superAdmin && given === superAdmin) {
    e.record.set('is_superadmin', true);
    e.next();
    console.log(`[signup] new super admin (super-admin code): ${e.record.email()}`);
    return;
  }

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
