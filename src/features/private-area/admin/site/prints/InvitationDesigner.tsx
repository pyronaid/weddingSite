import { useEffect, useId, useState } from 'react';
import formStyles from '../../../../../components/Form/Form.module.css';
import { loadGlyphFonts } from '../../../../../brand/glyphs';
import { monogramParts } from '../../../../../brand/monogram';
import { usePersistentState } from '../../../../../hooks/usePersistentState';
import { getLanguage, isLanguage, LANGUAGES, LOCALES, useMessages, type Language } from '../../../../../i18n';
import { DECORATIONS, spray } from '../../../../../prints/decorations';
import {
  DEFAULT_INVITATION,
  INVITATION_SIZES,
  invitationSvg,
  type InvitationDesign,
  type InvitationSize,
  type NameLines,
} from '../../../../../prints/invitations';
import { download, printDocument, printHtml, svgFile, svgToPng } from '../../../../../prints/output';
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
import styles from './prints.module.css';
import { useLogoDesign } from './useLogoDesign';

const SIZES = Object.keys(INVITATION_SIZES) as InvitationSize[];
const NAME_LINES: NameLines[] = ['none', 'one', 'two'];
/** 300 dpi. */
const pngWidth = (size: InvitationSize) => Math.round((INVITATION_SIZES[size].width / 25.4) * 300);

interface Data {
  content: SiteContent;
  signupCode: string;
  qr: string;
}

type State = { status: 'loading' } | { status: 'ready'; data: Data } | { status: 'error'; message: string };

/**
 * The invitation designer: size, language, the line for the names, title and
 * subtitle, the logo, the QR code section, the background and the side
 * decorations. The card is made from the site settings; the preview follows
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
  // First time: in the language of the site.
  const [design, setDesign] = usePersistentState<InvitationDesign>('prints.invitation.v1', {
    ...DEFAULT_INVITATION,
    language: getLanguage(),
  });
  const [logoDesign] = useLogoDesign();
  const [fonts, setFonts] = useState<Awaited<ReturnType<typeof loadGlyphFonts>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    // Always the latest settings: what the site shows now.
    Promise.all([siteRepository.load(), repository.getSettings(), qrSvg(url), loadGlyphFonts()]).then(
      ([content, settings, qr, glyphs]) => {
        if (!current) return;
        setFonts(glyphs);
        setState({ status: 'ready', data: { content, signupCode: settings.signupCode, qr } });
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
    };
  }, [siteRepository, repository, auth, url, attempt]);

  const change = (changes: Partial<InvitationDesign>) => setDesign((current) => ({ ...current, ...changes }));
  const language: Language = isLanguage(design.language) ? design.language : getLanguage();
  const card = printMessages[language].card;

  const data = state.status === 'ready' ? state.data : null;
  const svg =
    data && fonts
      ? invitationSvg({
          design: { ...design, language },
          content: data.content,
          url,
          qrSvg: data.qr,
          logo: design.logo ? monogramParts(logoDesign, fonts, `${id}-logo`) : undefined,
          signupCode: data.signupCode,
          locale: LOCALES[language],
          texts: card,
        })
      : null;
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
          <div className={styles.actions}>
            <ExportButton
              label={t.print}
              item={inv.name}
              busy={busy}
              id="print"
              disabled={!svg}
              onClick={() => void run('print', () => printHtml(printDocument([svg!], size, inv.name)))}
            />
            <ExportButton
              label={t.svg}
              item={inv.name}
              busy={busy}
              id="svg"
              disabled={!svg}
              onClick={() => download(`${file}.svg`, svgFile(svg!))}
            />
            <ExportButton
              label={t.png}
              item={inv.name}
              busy={busy}
              id="png"
              disabled={!svg}
              onClick={() =>
                void run('png', async () => download(`${file}.png`, await svgToPng(svg!, pngWidth(design.size))))
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

        <div className={styles.options}>
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
            <legend>{inv.decoration}</legend>
            {DECORATIONS.map((value) => (
              <label key={value} className={`${styles.choice} ${styles.choiceCard}`}>
                <input
                  type="radio"
                  name={`${id}-decoration`}
                  checked={design.decoration === value}
                  onChange={() => change({ decoration: value })}
                />
                <span className={styles.thumb}>
                  <svg viewBox="-6 -6 80 80" aria-hidden="true">
                    <g dangerouslySetInnerHTML={{ __html: spray(value, design.decorationColor) }} />
                  </svg>
                </span>
                <span>{inv.decorations[value]}</span>
              </label>
            ))}
          </fieldset>
          {design.decoration !== 'none' && (
            <ColorPicker
              legend={inv.decorationColour}
              value={design.decorationColor}
              onChange={(decorationColor) => change({ decorationColor })}
              swatches={SWATCHES}
              names={t.colours.names}
            />
          )}
        </div>
      </div>
    </section>
  );
}
