/// <reference path="../pb_data/types.d.ts" />

/**
 * A second sign-up code that makes the new account a super admin
 * (pb_hooks/signup.pb.js): app_settings `superadmin_signup_code`, editable by
 * super admins from the site (Site settings → Sign-up code). Empty: nobody
 * can sign up as a super admin (only a superuser can grant it, admin UI).
 *
 * The first code comes from the PB_SUPERADMIN_SIGNUP_CODE environment
 * variable (.env); without it, this way in stays closed. A code shorter than
 * 10 characters, or the same as the guests' one, is refused (left closed).
 */
const MIN_LENGTH = 10;

migrate(
  (app) => {
    const normalize = (value) =>
      String(value || '')
        .trim()
        .toLowerCase();
    let code = ($os.getenv('PB_SUPERADMIN_SIGNUP_CODE') || '').trim();
    let guests = '';
    try {
      guests = app.findFirstRecordByFilter('app_settings', "key = 'signup_code'").getString('value');
    } catch {
      // No guests' code: nothing to compare with.
    }
    if (code && (code.length < MIN_LENGTH || code.length > 50)) {
      console.log(
        `[signup] PB_SUPERADMIN_SIGNUP_CODE must be ${MIN_LENGTH} to 50 characters: super-admin sign-up stays closed`,
      );
      code = '';
    } else if (code && normalize(code) === normalize(guests)) {
      console.log(
        "[signup] PB_SUPERADMIN_SIGNUP_CODE is the same as the guests' code: super-admin sign-up stays closed",
      );
      code = '';
    }

    const record = new Record(app.findCollectionByNameOrId('app_settings'));
    record.set('key', 'superadmin_signup_code');
    record.set('value', code);
    app.save(record);
  },
  (app) => {
    try {
      app.delete(app.findFirstRecordByFilter('app_settings', "key = 'superadmin_signup_code'"));
    } catch {
      // Already gone.
    }
  },
);
