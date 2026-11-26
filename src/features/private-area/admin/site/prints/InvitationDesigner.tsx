import { useCallback, useEffect, useId, useState } from 'react';
import formStyles from '../../../../../components/Form/Form.module.css';
import { loadGlyphFonts } from '../../../../../brand/glyphs';
import { monogramParts } from '../../../../../brand/monogram';
import { fileLabel, paint } from '../../../../../brand/svgFiles';
import { getLanguage, isLanguage, LANGUAGES, LOCALES, useMessages, type Language } from '../../../../../i18n';
import { DECORATIONS, loadInvitationArt, PATTERNS, withPictures, type InvitationArt } from '../../../../../prints/art';
import {
  CORNER_ADJUST,
  decorationResolution,
  DEFAULT_INVITATION,
  INVITATION_SIZES,
  invitationSvg,
  NO_CORNER_ADJUSTMENT,
  PATTERN_OPACITY,
  patternLayer,
  sanitizeInvitation,
  type InvitationDesign,
  type InvitationSize,
  type NameLines,
} from '../../../../../prints/invitations';
import { download, pictureAsPng, printDocument, printHtml, svgFile, svgToPng } from '../../../../../prints/output';
import { qrSvg } from '../../../../../prints/qr';
import { toAdminError } from '../../../../../services/admin';
import type { SiteContent } from '../../../../../services/site';
import { useSiteContent } from '../../../../../site/SiteContentContext';
import { BACKGROUND_SWATCHES, printMessages, SWATCHES } from '../../../messages/prints';
import { siteSettingsMessages } from '../../../messages/siteSettings';
import { useAuth } from '../../../useAuth';
import { useAdminRepository } from '../../AdminRepositoryContext';
import { ColorPicker } from './ColorPicker';
import { ExportButton } from './ExportButton';
import { NudgeControls } from './NudgeControls';
import styles from './prints.module.css';
import { SaveStatus } from './SaveStatus';
import { useLogoDesign } from './useLogoDesign';
import { useSavedDesign } from './useSavedDesign';

const SIZES = Object.keys(INVITATION_SIZES) as InvitationSize[];
const NAME_LINES: NameLines[] = ['none', 'one', 'two'];
/** 300 dpi. */
const pngWidth = (size: InvitationSize) => Math.round((INVITATION_SIZES[size].width / 25.4) * 300);

interface Data {
  content: SiteContent;
  signupCode: string;
  qr: string;
  /** The decoration and pattern files, the pictures embedded (for the files made). */
  art: InvitationArt;
  /** The same, the pictures as in-memory addresses: the preview is drawn again at every change. */
  previewArt: InvitationArt;
}

/** A picture's in-memory copy, for the preview (the embedded one where the browser has none). */
async function previewAddress(href: string, made: string[]): Promise<string> {
  if (typeof URL.createObjectURL !== 'function') return href;
  try {
    const address = URL.createObjectURL(await (await fetch(href)).blob());
    made.push(address);
    return address;
  } catch {
    return href;
  }
}

/** The piece of a pattern shown on its button, in millimetres of the card. */
const PATTERN_SAMPLE = 60;

type State = { status: 'loading' } | { status: 'ready'; data: Data } | { status: 'error'; message: string };

/**
 * The invitation designer: size, language, the line for the names, title and
 * subtitle, the logo, the QR code section, the background, the side
 * decorations and a background pattern. The card is made from the site settings; the preview follows
 * every choice.
 */
export function InvitationDesigner({ url }: { url: string }) {
  const t = useMessages(printMessages);
  const inv = t.invitations;
  const languageNames = useMessages(siteSettingsMessages).language.names;
  const id = useId().replace(/:/g, '');
  const { repository: siteRepository } = useSiteContent();
  const repository = useAdminRepository();
  const { auth } = useAuth();
  // Never saved: in the language of the site.
  const sanitize = useCallback((raw: unknown) => sanitizeInvitation(raw, getLanguage()), []);
  const saved = useSavedDesign('invitation', { sanitize, legacyKey: 'wedding.prints.invitation.v1' });
  const design = saved.design ?? { ...DEFAULT_INVITATION, language: getLanguage() };
  const setDesign = saved.setDesign;
  const logoDesign = useLogoDesign().design;
  const [fonts, setFonts] = useState<Awaited<ReturnType<typeof loadGlyphFonts>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const previewAddresses: string[] = [];
    // Always the latest settings: what the site shows now.
    Promise.all([
      siteRepository.load(),
      repository.getSettings(),
      qrSvg(url),
      loadGlyphFonts(),
      loadInvitationArt().then(async (art) => ({
        art,
        previewArt: await withPictures(art, (href) => previewAddress(href, previewAddresses)),
      })),
    ]).then(
      ([content, settings, qr, glyphs, { art, previewArt }]) => {
        if (!current) return;
        setFonts(glyphs);
        setState({ status: 'ready', data: { content, signupCode: settings.signupCode, qr, art, previewArt } });
      },
      (reason: unknown) => {
        if (!current) return;
        const error = toAdminError(reason);
        if (error.code === 'unauthenticated') auth.logout();
        setState({ status: 'error', message: error.message });
      },
    );
    return () => {
      current = false;
      previewAddresses.forEach((address) => URL.revokeObjectURL(address));
    };
  }, [siteRepository, repository, auth, url, attempt]);

  const change = (changes: Partial<InvitationDesign>) => setDesign((current) => ({ ...current, ...changes }));
  const language: Language = isLanguage(design.language) ? design.language : getLanguage();
  const card = printMessages[language].card;

  const data = state.status === 'ready' ? state.data : null;
  /** The card with these pictures: in-memory ones for the preview, embedded ones for the files. */
  const cardWith = (art: InvitationArt) =>
    data && fonts && saved.design
      ? invitationSvg({
          design: { ...design, language },
          content: data.content,
          url,
          qrSvg: data.qr,
          logo: design.logo && logoDesign ? monogramParts(logoDesign, fonts, `${id}-logo`) : undefined,
          signupCode: data.signupCode,
          locale: LOCALES[language],
          texts: card,
          art,
        })
      : null;
  const svg = data ? cardWith(data.previewArt) : null;
  const exported = () => cardWith(data!.art)!;
  const decorationArt = design.decoration === 'none' ? undefined : data?.art.decorations.get(design.decoration);
  const patternArt = design.pattern === 'none' ? undefined : data?.art.patterns.get(design.pattern);
  const resolution = decorationResolution(design, data?.art);
  /** A new decoration starts in its corners (its moves were made for the previous one). */
  const chooseDecoration = (decoration: string) =>
    change({ decoration, decorationAdjustments: [NO_CORNER_ADJUSTMENT, NO_CORNER_ADJUSTMENT] });
  const adjustCorner = (corner: 0 | 1, next: InvitationDesign['decorationAdjustments'][number]) => {
    const decorationAdjustments: InvitationDesign['decorationAdjustments'] = [...design.decorationAdjustments];
    decorationAdjustments[corner] = next;
    change({ decorationAdjustments });
  };
  const size = INVITATION_SIZES[design.size];
  const file = `invitation-${design.size}`;

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  /** A text field showing the default until changed, with a way back to it. */
  const textOption = (key: 'heading' | 'subheading' | 'qrText', label: string, fallback: string, multiline = false) => {
    const value = design[key] ?? fallback;
    const props = {
      id: `${id}-${key}`,
      value,
      onChange: (event: { target: { value: string } }) => change({ [key]: event.target.value }),
    };
    return (
      <div className={formStyles.field}>
        <label htmlFor={props.id}>{label}</label>
        {multiline ? <textarea rows={2} maxLength={200} {...props} /> : <input maxLength={80} {...props} />}
        {design[key] !== null && (
          <button
            type="button"
            className={`${formStyles.textButton} ${styles.resetText}`}
            onClick={() => change({ [key]: null })}
          >
            {inv.resetText}
          </button>
        )}
      </div>
    );
  };

  return (
    <section className={styles.group} aria-labelledby={`${id}-title`}>
      <div className={styles.groupHead}>
        <h4 id={`${id}-title`} className={styles.title}>
          {inv.title}
        </h4>
        <button
          type="button"
          className={formStyles.textButton}
          disabled={state.status === 'loading'}
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          {state.status === 'loading' ? t.generating : t.regenerate}
        </button>
      </div>
      <p className={formStyles.hint}>{inv.hint}</p>
      {state.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {t.failed} {state.message}
        </div>
      )}

      <div className={styles.designer}>
        <div className={styles.previewColumn}>
          <div
            className={styles.invitationPreview}
            style={{ aspectRatio: `${size.width} / ${size.height}` }}
            role="img"
            aria-label={inv.name}
            aria-busy={!svg}
            // Our own SVG (every text escaped): inline, so it uses the page's fonts.
            dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
          />
          <SaveStatus status={saved.status} error={saved.error} onRetry={saved.retry} />
          <div className={styles.actions}>
            <ExportButton
              label={t.print}
              item={inv.name}
              busy={busy}
              id="print"
              disabled={!svg}
              onClick={() => void run('print', () => printHtml(printDocument([exported()], size, inv.name)))}
            />
            <ExportButton
              label={t.svg}
              item={inv.name}
              busy={busy}
              id="svg"
              disabled={!svg}
              onClick={() =>
                void run('svg', async () => {
                  // PNG pictures inside: design programs do not all open WebP in an SVG.
                  const art = await withPictures(data!.art, pictureAsPng);
                  download(`${file}.svg`, svgFile(cardWith(art)!));
                })
              }
            />
            <ExportButton
              label={t.png}
              item={inv.name}
              busy={busy}
              id="png"
              disabled={!svg}
              onClick={() =>
                void run('png', async () => download(`${file}.png`, await svgToPng(exported(), pngWidth(design.size))))
              }
            />
            <button
              type="button"
              className={formStyles.textButton}
              onClick={() => setDesign({ ...DEFAULT_INVITATION, language: getLanguage() })}
            >
              {inv.reset}
            </button>
          </div>
        </div>

        {/* Disabled until the saved choices are there: nothing edited is lost or overwritten. */}
        <fieldset className={styles.options} disabled={!saved.design}>
          {(design.decoration !== 'none' || design.logo) && (
            <fieldset className={styles.choices}>
              <legend>{inv.corners}</legend>
              <p className={formStyles.hint}>{inv.cornersHint}</p>
              <div className={styles.corners}>
                {design.decoration !== 'none' &&
                  ([0, 1] as const).map((corner) => (
                    <div key={corner} className={styles.corner}>
                      <span className={styles.cornerTitle}>{inv.cornerTitles[corner]}</span>
                      <NudgeControls
                        which={inv.cornerAdjust.which[corner]}
                        value={design.decorationAdjustments[corner]}
                        limits={CORNER_ADJUST}
                        labels={inv.cornerAdjust}
                        onChange={(next) => adjustCorner(corner, next)}
                      />
                    </div>
                  ))}
                {design.logo && (
                  <div className={styles.corner}>
                    <span className={styles.cornerTitle}>{inv.logoTitle}</span>
                    <NudgeControls
                      which={inv.logoTitle}
                      value={design.logoAdjustment}
                      limits={CORNER_ADJUST}
                      labels={inv.logoAdjust}
                      onChange={(logoAdjustment) => change({ logoAdjustment })}
                    />
                  </div>
                )}
              </div>
              {resolution &&
                ([0, 1] as const)
                  .filter((corner) => resolution[corner] < 200)
                  .map((corner) => (
                    <p key={corner} role="status" className={styles.letterNote}>
                      {inv.lowResolution(inv.cornerAdjust.which[corner], resolution[corner])}
                    </p>
                  ))}
            </fieldset>
          )}

          <fieldset className={styles.choices}>
            <legend>{inv.decoration}</legend>
            {DECORATIONS.map((value) => {
              const decoration = data?.previewArt.decorations.get(value);
              return (
                <label key={value} className={`${styles.choice} ${styles.choiceCard}`}>
                  <input
                    type="radio"
                    name={`${id}-decoration`}
                    checked={design.decoration === value}
                    onChange={() => chooseDecoration(value)}
                  />
                  <span className={styles.thumb}>
                    {decoration?.kind === 'drawing' && (
                      <svg
                        viewBox={decoration.file.viewBox}
                        aria-hidden="true"
                        // Our own files, cleaned when read (svgFiles.ts).
                        dangerouslySetInnerHTML={{
                          __html: paint(decoration.file, design.decorationColor, `${id}-decoration`, {
                            keepWhite: true,
                          }),
                        }}
                      />
                    )}
                    {decoration?.kind === 'picture' && (
                      <img src={decoration.file.href} alt="" loading="lazy" decoding="async" />
                    )}
                  </span>
                  <span>{value === 'none' ? inv.noDecoration : fileLabel(value)}</span>
                </label>
              );
            })}
          </fieldset>
          {design.decoration !== 'none' &&
            (decorationArt?.kind === 'picture' ? (
              <p className={formStyles.hint}>{inv.ownColours}</p>
            ) : (
              <ColorPicker
                legend={inv.decorationColour}
                value={design.decorationColor}
                onChange={(decorationColor) => change({ decorationColor })}
                swatches={SWATCHES}
                names={t.colours.names}
              />
            ))}

          <fieldset className={styles.choices}>
            <legend>{inv.background}</legend>
            <label className={styles.choice}>
              <input
                type="radio"
                name={`${id}-bg`}
                checked={design.background === null}
                onChange={() => change({ background: null })}
              />
              {inv.backgroundNone}
            </label>
            <label className={styles.choice}>
              <input
                type="radio"
                name={`${id}-bg`}
                checked={design.background !== null}
                onChange={() => change({ background: BACKGROUND_SWATCHES.blush })}
              />
              {inv.backgroundGradient}
            </label>
          </fieldset>
          {design.background !== null && (
            <ColorPicker
              legend={inv.backgroundColour}
              value={design.background}
              onChange={(background) => change({ background })}
              swatches={BACKGROUND_SWATCHES}
              names={t.colours.backgrounds}
            />
          )}

          <fieldset className={styles.choices}>
            <legend>{inv.pattern}</legend>
            {PATTERNS.map((value) => {
              const pattern = data?.previewArt.patterns.get(value);
              return (
                <label key={value} className={`${styles.choice} ${styles.choiceCard}`}>
                  <input
                    type="radio"
                    name={`${id}-pattern`}
                    checked={design.pattern === value}
                    onChange={() => change({ pattern: value })}
                  />
                  <span className={styles.thumb}>
                    {pattern && (
                      // At full strength, so it can be told apart; the card shows the chosen strength.
                      <svg
                        viewBox={`0 0 ${PATTERN_SAMPLE} ${PATTERN_SAMPLE}`}
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{
                          __html: patternLayer(
                            pattern,
                            design.patternColor,
                            100,
                            PATTERN_SAMPLE,
                            PATTERN_SAMPLE,
                            `${id}-pattern-${value}`,
                          ),
                        }}
                      />
                    )}
                  </span>
                  <span>{value === 'none' ? inv.noPattern : fileLabel(value)}</span>
                </label>
              );
            })}
          </fieldset>
          {design.pattern !== 'none' && (
            <>
              {patternArt?.kind === 'picture' ? (
                <p className={formStyles.hint}>{inv.patternOwnColours}</p>
              ) : (
                <ColorPicker
                  legend={inv.patternColour}
                  value={design.patternColor}
                  onChange={(patternColor) => change({ patternColor })}
                  swatches={SWATCHES}
                  names={t.colours.names}
                />
              )}
              <div className={formStyles.field}>
                <label htmlFor={`${id}-pattern-opacity`}>{inv.patternOpacity}</label>
                <div className={styles.range}>
                  <input
                    id={`${id}-pattern-opacity`}
                    type="range"
                    min={PATTERN_OPACITY.min}
                    max={PATTERN_OPACITY.max}
                    step={PATTERN_OPACITY.step}
                    value={design.patternOpacity}
                    aria-describedby={`${id}-pattern-opacity-hint`}
                    aria-valuetext={`${design.patternOpacity}%`}
                    onChange={(event) => change({ patternOpacity: Number(event.target.value) })}
                  />
                  <output htmlFor={`${id}-pattern-opacity`}>{design.patternOpacity}%</output>
                </div>
                <span id={`${id}-pattern-opacity-hint`} className={formStyles.hint}>
                  {inv.patternHint}
                </span>
              </div>
            </>
          )}

          <fieldset className={styles.choices}>
            <legend>{inv.size}</legend>
            {SIZES.map((value) => (
              <label key={value} className={styles.choice}>
                <input
                  type="radio"
                  name={`${id}-size`}
                  checked={design.size === value}
                  onChange={() => change({ size: value })}
                />
                {inv.sizes[value]}
              </label>
            ))}
          </fieldset>

          <div className={formStyles.field}>
            <label htmlFor={`${id}-language`}>{inv.language}</label>
            <select
              id={`${id}-language`}
              value={language}
              aria-describedby={`${id}-language-hint`}
              onChange={(event) => isLanguage(event.target.value) && change({ language: event.target.value })}
            >
              {LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {languageNames[value]}
                </option>
              ))}
            </select>
            <span id={`${id}-language-hint`} className={formStyles.hint}>
              {inv.languageHint}
            </span>
          </div>

          <fieldset className={styles.choices}>
            <legend>{inv.names}</legend>
            {NAME_LINES.map((value) => (
              <label key={value} className={styles.choice}>
                <input
                  type="radio"
                  name={`${id}-names`}
                  checked={design.names === value}
                  onChange={() => change({ names: value })}
                />
                {inv.nameLines[value]}
              </label>
            ))}
          </fieldset>

          {textOption('heading', inv.heading, card.heading[design.names])}
          {textOption('subheading', inv.subheading, card.to)}

          <label className={styles.check}>
            <input type="checkbox" checked={design.logo} onChange={(event) => change({ logo: event.target.checked })} />
            {inv.logo}
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={design.qr} onChange={(event) => change({ qr: event.target.checked })} />
            {inv.qr}
          </label>
          {design.qr && textOption('qrText', inv.qrText, card.website, true)}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={design.signupCode}
              onChange={(event) => change({ signupCode: event.target.checked })}
            />
            {inv.signupCode}
          </label>
        </fieldset>
      </div>
    </section>
  );
}
