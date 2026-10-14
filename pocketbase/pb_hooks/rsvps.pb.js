/// <reference path="../pb_data/types.d.ts" />

/**
 * Cross-field validation that collection rules cannot express:
 * a guest who declines cannot bring people, one who accepts brings >= 1.
 */
onRecordCreateRequest((e) => {
  const attending = e.record.getBool('attending');
  const guests = e.record.getInt('guests');

  if (!attending && guests !== 0) {
    throw new BadRequestError('Guests must be 0 when not attending.');
  }
  if (attending && guests < 1) {
    throw new BadRequestError('At least 1 guest is required when attending.');
  }

  e.next();
}, 'rsvps');
