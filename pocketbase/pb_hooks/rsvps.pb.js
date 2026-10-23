/// <reference path="../pb_data/types.d.ts" />

/**
 * Cross-field validation that collection rules cannot express:
 * a guest who declines cannot bring people, one who accepts brings >= 1.
 */
onRecordCreateRequest((e) => {
  const { t } = require(`${__hooks}/lib/i18n.js`);
  const attending = e.record.getBool('attending');
  const guests = e.record.getInt('guests');

  if (!attending && guests !== 0) {
    throw new BadRequestError(t(e.app, 'rsvp_guests_not_attending'));
  }
  if (attending && guests < 1) {
    throw new BadRequestError(t(e.app, 'rsvp_guests_attending'));
  }

  e.next();
}, 'rsvps');
