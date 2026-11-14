import { sans } from '../brand/glyphs/sans';
import { script } from '../brand/glyphs/script';
import { serif } from '../brand/glyphs/serif';
import { DEFAULT_MONOGRAM, monogramParts } from '../brand/monogram';
import { defaultContent } from '../config/wedding';
import { printMessages } from '../features/private-area/messages/prints';
import { DECORATIONS, spray } from './decorations';
import { DEFAULT_INVITATION, invitationSvg, type InvitationDesign, type InvitationInput } from './invitations';
import { printDocument } from './output';
import { posterSvg } from './posters';
import { wrapText } from './svg';

const QR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges"><path d="M0 0h7v7H0z"/></svg>';
const logo = monogramParts(DEFAULT_MONOGRAM, { script, sans, serif }, 'test');

const invitation = (design: Partial<InvitationDesign> = {}, input: Partial<InvitationInput> = {}) => {
  const full = { ...DEFAULT_INVITATION, ...design };
  return invitationSvg({
    design: full,
    content: defaultContent,
    url: 'https://gioevale.com',
    qrSvg: QR,
    logo,
    signupCode: '#wedding',
    locale: full.language === 'it' ? 'it-IT' : 'en-GB',
    texts: printMessages[full.language].card,
    ...input,
  });
};

describe('wrapText', () => {
  it('breaks at spaces, and shortens what does not fit', () => {
    expect(wrapText('Piazza San Pietro 1, 00120 Roma', 18)).toEqual(['Piazza San Pietro', '1, 00120 Roma']);
    expect(wrapText('short', 20)).toEqual(['short']);
    expect(wrapText('one two three four five six', 8, 2)).toEqual(['one two', 'three…']);
  });
});

describe('invitations', () => {
  it('has the couple, the date, both venues with their times, the deadline, the QR code and the logo', () => {
    const svg = invitation();
    expect(svg).toContain('width="210mm" height="297mm"');
    expect(svg).toContain('You are invited');
    expect(svg).toContain('to celebrate the wedding of');
    expect(svg).toContain('>Giulia <tspan fill="#c24f78">&amp;</tspan> Marco</text>');
    // With or without the comma, depending on the browser's date data.
    expect(svg).toMatch(/Saturday,? 19 June 2027/);
    expect(svg).toContain('>at 16:00<');
    expect(svg).toContain('>at 19:00<');
    expect(svg).toContain('CEREMONY');
    expect(svg).toContain('RECEPTION');
    expect(svg).toContain('Please reply by 30 April 2027');
    expect(svg).toContain('>gioevale.com<');
    expect(svg).toContain('viewBox="0 0 29 29" shape-rendering="crispEdges"');
    expect(svg).toContain('Code for the private area: #wedding');
    expect(svg).toContain('mask="url(#test-gap)"');
    // No frame any more.
    expect(svg).not.toContain('rx=');
  });

  it('comes in three sizes', () => {
    expect(invitation({ size: 'square' })).toContain('width="150mm" height="150mm"');
    expect(invitation({ size: 'a4-landscape' })).toContain('width="297mm" height="210mm"');
  });

  it('has no line, one line or two for the names', () => {
    const lines = (names: InvitationDesign['names']) =>
      (invitation({ names, qr: false }).match(/<line /g) ?? []).length;
    // The line under the date is always there.
    expect(lines('none')).toBe(1);
    expect(lines('one')).toBe(2);
    expect(lines('two')).toBe(3);
    expect(invitation({ names: 'two' })).toContain('You are both invited');
    expect(invitation({ names: 'none' })).not.toContain('>Dear<');
  });

  it('takes a title, a subtitle and a QR text of its own, or none', () => {
    const svg = invitation({ heading: 'Save the date', subheading: '', qrText: 'All the details online' });
    expect(svg).toContain('Save the date');
    expect(svg).not.toContain('to celebrate');
    expect(svg).toContain('All the details online');
  });

  it('leaves out the QR code, the logo and the sign-up code on request', () => {
    const svg = invitation({ qr: false, logo: false, signupCode: false });
    expect(svg).not.toContain('viewBox="0 0 29 29"');
    expect(svg).not.toContain('Please reply');
    expect(svg).not.toContain('test-gap');
    expect(svg).not.toContain('#wedding<');
    // The code alone, without the QR block.
    expect(invitation({ qr: false })).toContain('Code for the private area: #wedding');
  });

  it('shades the background in the chosen colour, or leaves it white', () => {
    expect(invitation({ background: '#f6d3df' })).toContain('<stop offset="0" stop-color="#f6d3df"/>');
    expect(invitation()).toContain('<rect width="210" height="297" fill="#ffffff"/>');
  });

  it.each(DECORATIONS.filter((decoration) => decoration !== 'none'))('decorates two corners with %s', (decoration) => {
    const svg = invitation({ decoration, decorationColor: '#123456' });
    expect(svg).toContain('#123456');
    expect(svg).toContain('rotate(180)');
    expect(spray(decoration, '#123456')).not.toBe('');
  });

  it('has no decorations when asked', () => {
    expect(invitation({ decoration: 'none' })).not.toContain('rotate(180)');
  });

  it('centres the ceremony alone when there is no reception', () => {
    const svg = invitation({}, { content: { ...defaultContent, reception: null } });
    expect(svg).not.toContain('RECEPTION');
  });

  it('escapes what the super admin typed', () => {
    const svg = invitation(
      { heading: '<b>Hi</b>' },
      {
        content: { ...defaultContent, couple: { ...defaultContent.couple, partnerOne: 'Ann<script>' } },
        signupCode: 'a&b"',
      },
    );
    expect(svg).toContain('Ann&lt;script&gt;');
    expect(svg).toContain('&lt;b&gt;Hi&lt;/b&gt;');
    expect(svg).toContain('a&amp;b&quot;');
    expect(svg).not.toContain('<script>');
  });

  it('speaks Italian, in a neutral way, with Italian dates', () => {
    const one = invitation({ language: 'it' });
    expect(one).toContain('Ti invitiamo');
    expect(one).toContain('>Per<');
    expect(one).toMatch(/Sabato,? 19 giugno 2027/);
    expect(one).toContain('Rispondi entro il 30 aprile 2027');
    expect(one).toContain('>ore 16:00<');
    const couple = invitation({ language: 'it', names: 'two' });
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
      texts: printMessages.en.posters.texts,
    });
    expect(svg).toContain('width="297mm" height="420mm"');
    expect(svg).toContain('Scan me to win the 5 of clubs');
    expect(svg).toContain('https://gioevale.com/area/riddles/abc');
    expect(svg).toContain('viewBox="0 0 240 336"');
  });
});

describe('printDocument', () => {
  it('prints one page per SVG, at the given size', () => {
    const pages = ['<svg>1</svg>', '<?xml version="1.0"?>\n<svg>2</svg>'];
    const html = printDocument(pages, { width: 150, height: 150 }, 'Cards');
    expect(html.match(/class="sheet"/g)).toHaveLength(2);
    expect(html).toContain('@page { size: 150mm 150mm; margin: 0; }');
    expect(html).toContain('<div class="sheet"><svg>2</svg></div>');
    expect(printDocument(pages, { width: 297, height: 420 }, '<b>')).toContain('<title>&lt;b></title>');
  });
});
