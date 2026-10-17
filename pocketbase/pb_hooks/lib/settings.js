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

module.exports = { getSetting, setSetting, normalizeCode };
