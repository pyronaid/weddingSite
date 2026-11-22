/// <reference path="../../pb_data/types.d.ts" />

/** Key/value settings of the `app_settings` collection (loaded with require()). */

function getSetting(app, key, fallback) {
  try {
    return app.findFirstRecordByFilter('app_settings', 'key = {:key}', { key }).getString('value');
  } catch {
    return fallback;
  }
}

function setSetting(app, key, value) {
  let record;
  try {
    record = app.findFirstRecordByFilter('app_settings', 'key = {:key}', { key });
  } catch {
    record = new Record(app.findCollectionByNameOrId('app_settings'));
    record.set('key', key);
  }
  record.set('value', value);
  app.save(record);
}

/** Secret codes are compared ignoring surrounding spaces and letter case. */
function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/** A super-admin code is a key to everything: longer than the guests' one. */
const SUPERADMIN_CODE_MIN = 10;

/**
 * The problems of a pair of sign-up codes, as { field: i18n key }: the
 * guests' code 3-50 characters (empty would let anyone in), the super-admin
 * one empty (closed) or 10-50, and the two different (a guest typing the
 * guests' code must never become a super admin).
 */
function checkSignupCodes(signupCode, superAdminSignupCode) {
  const errors = {};
  if (signupCode.length < 3 || signupCode.length > 50) errors.signupCode = 'secret_code_length';
  if (superAdminSignupCode && (superAdminSignupCode.length < SUPERADMIN_CODE_MIN || superAdminSignupCode.length > 50)) {
    errors.superAdminSignupCode = 'superadmin_code_length';
  } else if (superAdminSignupCode && normalizeCode(superAdminSignupCode) === normalizeCode(signupCode)) {
    errors.superAdminSignupCode = 'signup_codes_same';
  }
  return errors;
}

module.exports = { getSetting, setSetting, normalizeCode, checkSignupCodes, SUPERADMIN_CODE_MIN };
