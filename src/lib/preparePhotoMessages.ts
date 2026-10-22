import type { Dictionary } from '../i18n';

const en = {
  notAPhoto: 'This file is not a photo: please choose a picture (JPEG, PNG or WebP).',
  unsupported:
    'This photo format is not supported here: take the photo with the camera, or choose a JPEG, PNG or WebP picture.',
  tooSmall: (minSide: number) => `This picture is too small: a photo must be at least ${minSide} px wide and tall.`,
};

/** Why a chosen file cannot be uploaded as a photo (read when the check fails). */
export const preparePhotoMessages: Dictionary<typeof en> = {
  en,
  it: {
    notAPhoto: 'Questo file non è una foto: scegli un’immagine (JPEG, PNG o WebP).',
    unsupported:
      'Questo formato non è supportato qui: scatta la foto con la fotocamera, oppure scegli un’immagine JPEG, PNG o WebP.',
    tooSmall: (minSide) => `Questa immagine è troppo piccola: una foto deve essere larga e alta almeno ${minSide} px.`,
  },
};
