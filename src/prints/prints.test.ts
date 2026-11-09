import { LOGO_SCHEMES, logoParts } from '../brand/logo';
import { defaultContent } from '../config/wedding';
import { siteSettingsMessages } from '../features/private-area/messages/siteSettings';
import { invitationSvg, type InvitationInput } from './invitations';
import { printDocument } from './output';
import { posterSvg } from './posters';
import { wrapText } from './svg';

const en = siteSettingsMessages.en.prints;
const italian = siteSettingsMessages.it.prints;
const QR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><path d="M0 0h7v7H0z"/></svg>';

const invitation = (overrides: Partial<InvitationInput> = {}) =>
  invitationSvg({
    kind: 'single',
    content: defaultContent,
    url: 'https://gioevale.com',
    qrSvg: QR,
    logo: logoParts('script', LOGO_SCHEMES.color, 'test'),
    locale: 'en-GB',
    texts: en.invitations.texts,
    ...overrides,
  });

describe('wrapText', () => {
  it('breaks at spaces, and shortens what does not fit', () => {
    expect(wrapText('Piazza San Pietro 1, 00120 Roma', 18)).toEqual(['Piazza San Pietro', '1, 00120 Roma']);
    expect(wrapText('short', 20)).toEqual(['short']);
    expect(wrapText('one two three four five six', 8, 2)).toEqual(['one two', 'three…']);
  });
});

describe('invitations', () => {
  it('has the couple, the date, both venues with their times, the deadline and the QR code', () => {
    const svg = invitation();
    expect(svg).toContain('width="148mm" height="210mm"');
    expect(svg).toContain('You are invited');
    expect(svg).toContain('>Giulia <tspan fill="#c24f78">&amp;</tspan> Marco</text>');
    // With or without the comma, depending on the browser's date data.
    expect(svg).toMatch(/Saturday,? 19 June 2027/);
    expect(svg).toContain('>at 16:00<');
    expect(svg).toContain('>at 19:00<');
    expect(svg).toContain('CEREMONY');
    expect(svg).toContain('RECEPTION');
    expect(svg).toContain('Please reply by 30 April 2027');
    expect(svg).toContain('>gioevale.com<');
    expect(svg).toContain('viewBox="0 0 29 29"');
    // The sign-up code only when asked.
    expect(svg).not.toContain('Code for the private area');
    expect(invitation({ signupCode: '#Sposi2027' })).toContain('Code for the private area: #Sposi2027');
  });

  it('gives a couple two lines for their names, and says "both"', () => {
    const single = invitation();
    const couple = invitation({ kind: 'couple' });
    expect(couple).toContain('You are both invited');
    expect((couple.match(/<line /g) ?? []).length).toBe((single.match(/<line /g) ?? []).length + 1);
  });

  it('centres the ceremony alone when there is no reception', () => {
    const svg = invitation({ content: { ...defaultContent, reception: null } });
    expect(svg).not.toContain('RECEPTION');
    expect(svg).toContain('x="74" y="119"');
  });

  it('escapes what the super admin typed', () => {
    const svg = invitation({
      content: { ...defaultContent, couple: { ...defaultContent.couple, partnerOne: 'Ann<script>' } },
      signupCode: 'a&b"',
    });
    expect(svg).toContain('Ann&lt;script&gt;');
    expect(svg).toContain('a&amp;b&quot;');
    expect(svg).not.toContain('<script>');
  });

  it('speaks Italian, in a neutral way, with Italian dates', () => {
    const single = invitation({ texts: italian.invitations.texts, locale: 'it-IT' });
    expect(single).toContain('Ti invitiamo');
    expect(single).toMatch(/Sabato,? 19 giugno 2027/);
    expect(single).toContain('Rispondi entro il 30 aprile 2027');
    const couple = invitation({ kind: 'couple', texts: italian.invitations.texts, locale: 'it-IT' });
    expect(couple).toContain('Vi invitiamo');
    expect(couple).toContain('Rispondete entro');
  });
});

describe('posters', () => {
  it('puts the card and the QR code of its riddle on an A3 page', () => {
    const svg = posterSvg({
      cardName: '5 of clubs',
      cardSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 336"><rect width="240" height="336"/></svg>',
      qrSvg: QR,
      url: 'https://gioevale.com/area/riddles/abc',
      texts: en.posters.texts,
    });
    expect(svg).toContain('width="297mm" height="420mm"');
    expect(svg).toContain('Scan me to win the 5 of clubs');
    expect(svg).toContain('https://gioevale.com/area/riddles/abc');
    expect(svg).toContain('viewBox="0 0 240 336"');
  });
});

describe('printDocument', () => {
  it('prints one page per sheet, or two A5 per A4 sheet', () => {
    const pages = ['<svg>1</svg>', '<svg>2</svg>', '<svg>3</svg>'];
    expect(printDocument(pages, 'A3', 'Posters').match(/class="sheet"/g)).toHaveLength(3);
    const twoUp = printDocument(pages, 'A4-2up', 'Cards');
    expect(twoUp.match(/class="sheet"/g)).toHaveLength(2);
    expect(twoUp).toContain('size: A4 landscape');
    expect(twoUp).toContain('<div class="sheet"><svg>1</svg><svg>2</svg></div>');
    expect(printDocument(pages, 'A5', 'x')).toContain('size: A5 portrait');
    expect(printDocument(pages, 'A5', '<b>')).toContain('<title>&lt;b></title>');
  });
});
