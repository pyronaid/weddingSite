/// <reference path="../pb_data/types.d.ts" />

/**
 * Site content edited by the super admin (site_content, site_photos).
 * The collection rules decide WHO can write (super admins); these hooks
 * check WHAT is written, for every save (also from the PocketBase admin UI).
 */

// Values are normalised (IBAN/BIC uppercase without spaces) and checked
// before they reach the public page.
onRecordValidate((e) => {
  const { t } = require(`${__hooks}/lib/i18n.js`);
  const record = e.record;
  const errors = {};
  const fail = (field, key) => {
    errors[field] = new ValidationError(`validation_${key}`, t(e.app, key));
  };

  const iban = record.getString('iban').replace(/\s+/g, '').toUpperCase();
  record.set('iban', iban);
  // ISO 13616: country, check digits, then the account; the remainder of the
  // rearranged number by 97 must be 1. Computed in chunks (no big integers).
  const validIban = (() => {
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
    const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
    let remainder = 0;
    for (let index = 0; index < digits.length; index += 7) {
      remainder = Number(String(remainder) + digits.slice(index, index + 7)) % 97;
    }
    return remainder === 1;
  })();
  if (!validIban) fail('iban', 'iban_invalid');

  const bic = record.getString('bic').replace(/\s+/g, '').toUpperCase();
  record.set('bic', bic);
  if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) fail('bic', 'bic_invalid');

  // e.g. 2027-06-19T16:00:00+02:00: the offset keeps the countdown right everywhere.
  const date = record.getString('date');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(date) || Number.isNaN(Date.parse(date))) {
    fail('date', 'date_invalid');
  }
  if (Number.isNaN(Date.parse(`${record.getString('rsvp_deadline')}T12:00:00Z`))) fail('rsvp_deadline', 'date_invalid');
  // IANA names such as Europe/Rome (the site checks them against the browser's list).
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(record.getString('timezone'))) fail('timezone', 'timezone_invalid');

  if (record.getString('reception_name').trim()) {
    if (!record.getString('reception_address').trim()) fail('reception_address', 'reception_incomplete');
    if (!record.getString('reception_time')) fail('reception_time', 'reception_incomplete');
  }

  if (Object.keys(errors).length > 0) throw new BadRequestError(t(e.app, 'check_fields'), errors);
  e.next();
}, 'site_content');

// The e-mails follow the language: re-applied after every change (cheap).
onRecordAfterUpdateSuccess((e) => {
  const { applyEmailTemplates } = require(`${__hooks}/lib/emails.js`);
  try {
    applyEmailTemplates(e.app);
  } catch (error) {
    console.log('[site] could not update the e-mail templates:', error);
  }
  e.next();
}, 'site_content');

// Only the positions the site knows: see src/services/site/slots.ts.
onRecordValidate((e) => {
  const { t } = require(`${__hooks}/lib/i18n.js`);
  const slot = e.record.getString('slot');
  const section = /^(date|location|rsvp|gift)-(left|right)-[12]$/;
  const valid = slot === 'hero' || section.test(slot) || /^area-[1-8]$/.test(slot);
  if (!valid) {
    throw new BadRequestError(t(e.app, 'check_fields'), {
      slot: new ValidationError('validation_photo_slot', t(e.app, 'photo_slot_invalid')),
    });
  }
  e.next();
}, 'site_photos');
