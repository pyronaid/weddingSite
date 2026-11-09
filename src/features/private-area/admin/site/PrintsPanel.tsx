import { useCallback, useEffect, useId, useState } from 'react';
import formStyles from '../../../../components/Form/Form.module.css';
import {
  LOGO_SCHEMES,
  LOGO_VARIANTS,
  logoParts,
  logoSvg,
  type LogoScheme,
  type LogoVariant,
} from '../../../../brand/logo';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { LOCALES, useLanguage, useMessages } from '../../../../i18n';
import { INVITATION_KINDS, invitationSvg, type InvitationKind } from '../../../../prints/invitations';
import { download, printDocument, printHtml, svgFile, svgToPng } from '../../../../prints/output';
import { posterSvg } from '../../../../prints/posters';
import { qrSvg } from '../../../../prints/qr';
import { toAdminError } from '../../../../services/admin';
import { cardImageUrl, cardName, type Rank } from '../../../../services/game';
import { useSiteContent } from '../../../../site/SiteContentContext';
import { siteSettingsMessages } from '../../messages/siteSettings';
import { useAuth } from '../../useAuth';
import { useAdminRepository } from '../AdminRepositoryContext';
import styles from './site.module.css';

/** 300 dpi: A5 is 148 mm wide. */
const INVITATION_PNG_WIDTH = 1748;
const LOGO_PNG_WIDTH = 2048;

interface Poster {
  rank: Rank;
  name: string;
  ready: boolean;
  svg: string;
}

interface Generated {
  invitations: Record<InvitationKind, string>;
  posters: Poster[];
}

type State = { status: 'loading' } | { status: 'ready'; files: Generated } | { status: 'error'; message: string };

// The card images do not change: fetched once per visit.
const cardImages = new Map<number, Promise<string>>();
function clubImage(rank: number): Promise<string> {
  let image = cardImages.get(rank);
  if (!image) {
    image = fetch(cardImageUrl('clubs', rank as Rank)).then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.url}`);
      return response.text();
    });
    image.catch(() => cardImages.delete(rank));
    cardImages.set(rank, image);
  }
  return image;
}

const isLocal = (url: string) => /\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url);

/**
 * Super admins: the files to print, made in the browser from the current
 * site settings: the logo, the two invitations and the clubs posters.
 * "Regenerate" makes them again from the latest settings; nothing is stored.
 */
export function PrintsPanel() {
  const t = useMessages(siteSettingsMessages).prints;
  const language = useLanguage();
  const locale = LOCALES[language];
  const { repository: siteRepository } = useSiteContent();
  const repository = useAdminRepository();
  const { auth } = useAuth();
  const id = useId();
  const [website, setWebsite] = useState(() => window.location.origin);
  const url = useDebouncedValue(website.trim().replace(/\/+$/, ''), 500);
  const [includeCode, setIncludeCode] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    (async () => {
      // Always the latest settings and codes: what the site shows now.
      const [content, settings, codes, siteQr] = await Promise.all([
        siteRepository.load(),
        repository.getSettings(),
        repository.getRiddleCodes(),
        qrSvg(url),
      ]);
      const invitationTexts = t.invitations.texts;
      const invitations = Object.fromEntries(
        INVITATION_KINDS.map((kind) => [
          kind,
          invitationSvg({
            kind,
            content,
            url,
            qrSvg: siteQr,
            logo: logoParts('script', LOGO_SCHEMES.color, `invitation-${kind}`),
            signupCode: includeCode ? settings.signupCode : undefined,
            locale,
            texts: invitationTexts,
          }),
        ]),
      ) as Record<InvitationKind, string>;
      const posters = await Promise.all(
        codes.map(async (card): Promise<Poster> => {
          const riddleUrl = `${url}/area/riddles/${card.code}`;
          const name = cardName(card.rank, 'clubs');
          const [cardSvg, qr] = await Promise.all([clubImage(card.rank), qrSvg(riddleUrl)]);
          return {
            rank: card.rank,
            name,
            ready: card.ready,
            svg: posterSvg({ cardName: name, cardSvg, qrSvg: qr, url: riddleUrl, texts: t.posters.texts }),
          };
        }),
      );
      return { invitations, posters };
    })().then(
      (files) => current && setState({ status: 'ready', files }),
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
    // `t` and `locale` follow the site language; a new language re-renders everything anyway.
  }, [siteRepository, repository, auth, url, includeCode, attempt, t, locale]);

  /** Runs one export at a time, showing which one on its button. */
  const run = useCallback(async (key: string, task: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  }, []);

  const files = state.status === 'ready' ? state.files : null;
  const notReady = files?.posters.filter((poster) => !poster.ready).length ?? 0;

  return (
    <section className={styles.section} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.sectionTitle}>
        {t.title}
      </h3>
      <p className={formStyles.hint}>{t.intro}</p>

      <div className={styles.printOptions}>
        <div className={formStyles.field}>
          <label htmlFor={`${id}-website`}>{t.website}</label>
          <input
            id={`${id}-website`}
            type="url"
            value={website}
            inputMode="url"
            spellCheck={false}
            aria-describedby={`${id}-website-hint`}
            onChange={(event) => setWebsite(event.target.value)}
          />
          <span id={`${id}-website-hint`} className={formStyles.hint}>
            {isLocal(url) ? <strong className={styles.warning}>{t.localhost}</strong> : t.websiteHint}
          </span>
        </div>
        <button
          type="button"
          className={formStyles.secondary}
          disabled={state.status === 'loading'}
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          {state.status === 'loading' ? t.generating : t.regenerate}
        </button>
      </div>

      {state.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {t.failed} {state.message}
        </div>
      )}

      <LogoSection busy={busy} run={run} />

      <section className={styles.printGroup} aria-labelledby={`${id}-invitations`}>
        <h4 id={`${id}-invitations`} className={styles.printTitle}>
          {t.invitations.title}
        </h4>
        <p className={formStyles.hint}>{t.invitations.hint}</p>
        <label className={styles.check}>
          <input type="checkbox" checked={includeCode} onChange={(event) => setIncludeCode(event.target.checked)} />
          {t.invitations.includeCode}
        </label>
        <div className={styles.invitations} aria-busy={state.status === 'loading'}>
          {INVITATION_KINDS.map((kind) => {
            const name = t.invitations.name(t.invitations.kinds[kind]);
            const svg = files?.invitations[kind];
            return (
              <figure key={kind} className={styles.printItem}>
                {/* Our own SVG (every text escaped): inline, so it uses the page's fonts. */}
                <div
                  className={styles.invitationPreview}
                  role="img"
                  aria-label={name}
                  dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
                />
                <figcaption>{t.invitations.kinds[kind]}</figcaption>
                <div className={styles.printActions}>
                  <ExportButton
                    label={t.print}
                    item={name}
                    busy={busy}
                    id={`print-${kind}`}
                    disabled={!svg}
                    onClick={() => run(`print-${kind}`, () => printHtml(printDocument([svg!], 'A5', name)))}
                  />
                  <ExportButton
                    label={t.print2up}
                    item={name}
                    busy={busy}
                    id={`print2-${kind}`}
                    disabled={!svg}
                    onClick={() => run(`print2-${kind}`, () => printHtml(printDocument([svg!, svg!], 'A4-2up', name)))}
                  />
                  <ExportButton
                    label={t.svg}
                    item={name}
                    busy={busy}
                    id={`svg-${kind}`}
                    disabled={!svg}
                    onClick={() => download(`invitation-${kind}.svg`, svgFile(svg!))}
                  />
                  <ExportButton
                    label={t.png}
                    item={name}
                    busy={busy}
                    id={`png-${kind}`}
                    disabled={!svg}
                    onClick={() =>
                      run(`png-${kind}`, async () =>
                        download(`invitation-${kind}.png`, await svgToPng(svg!, INVITATION_PNG_WIDTH)),
                      )
                    }
                  />
                </div>
              </figure>
            );
          })}
        </div>
      </section>

      <section className={styles.printGroup} aria-labelledby={`${id}-posters`}>
        <h4 id={`${id}-posters`} className={styles.printTitle}>
          {t.posters.title}
        </h4>
        <p className={formStyles.hint}>{t.posters.hint}</p>
        {files && (
          <p role="status" className={notReady > 0 ? styles.warning : styles.allReady}>
            {notReady > 0 ? t.posters.notReady(notReady) : t.posters.ready}
          </p>
        )}
        {files && (
          <>
            <div className={styles.printActions}>
              <ExportButton
                label={t.printAll}
                item={t.posters.title}
                busy={busy}
                id="print-posters"
                onClick={() =>
                  run('print-posters', () =>
                    printHtml(
                      printDocument(
                        files.posters.map((poster) => poster.svg),
                        'A3',
                        t.posters.title,
                      ),
                    ),
                  )
                }
              />
            </div>
            <ul className={styles.posters}>
              {files.posters.map((poster) => {
                const name = t.posters.name(poster.name);
                return (
                  <li key={poster.rank} className={`${styles.printItem} ${poster.ready ? '' : styles.posterTodo}`}>
                    <div
                      className={styles.posterPreview}
                      role="img"
                      aria-label={name}
                      dangerouslySetInnerHTML={{ __html: poster.svg }}
                    />
                    <span className={styles.posterName}>
                      {poster.name}
                      {!poster.ready && <span className={styles.warning}> · {t.posters.missing}</span>}
                    </span>
                    <div className={styles.printActions}>
                      <ExportButton
                        label={t.svg}
                        item={name}
                        busy={busy}
                        id={`svg-poster-${poster.rank}`}
                        onClick={() =>
                          download(`poster-clubs-${String(poster.rank).padStart(2, '0')}.svg`, svgFile(poster.svg))
                        }
                      />
                      <ExportButton
                        label={t.print}
                        item={name}
                        busy={busy}
                        id={`print-poster-${poster.rank}`}
                        onClick={() =>
                          run(`print-poster-${poster.rank}`, () => printHtml(printDocument([poster.svg], 'A3', name)))
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}

/** The logo in every style and colour, to download. */
function LogoSection({
  busy,
  run,
}: {
  busy: string | null;
  run: (key: string, task: () => Promise<void> | void) => void;
}) {
  const t = useMessages(siteSettingsMessages).prints;
  const id = useId();
  const [variant, setVariant] = useState<LogoVariant>('script');
  const [scheme, setScheme] = useState<LogoScheme>('color');
  const name = t.logo.name(t.logo.variants[variant], t.logo.schemes[scheme]);
  const svg = logoSvg(variant, LOGO_SCHEMES[scheme], { title: name });
  const file = `logo-gv-${variant}${scheme === 'color' ? '' : `-${scheme}`}`;

  return (
    <section className={styles.printGroup} aria-labelledby={`${id}-logo`}>
      <h4 id={`${id}-logo`} className={styles.printTitle}>
        {t.logo.title}
      </h4>
      <p className={formStyles.hint}>{t.logo.hint}</p>
      <div className={styles.logoRow}>
        <div
          className={`${styles.logoPreview} ${scheme === 'light' ? styles.logoDark : ''}`}
          role="img"
          aria-label={name}
          // With a mask id of its own (the invitations draw the logo too), and named by this wrapper only.
          dangerouslySetInnerHTML={{ __html: svg.replaceAll('gv-', 'logo-preview-').replace(' role="img"', '') }}
        />
        <div className={styles.logoOptions}>
          <fieldset className={styles.choices}>
            <legend>{t.logo.style}</legend>
            {LOGO_VARIANTS.map((value) => (
              <label key={value} className={styles.choice}>
                <input
                  type="radio"
                  name={`${id}-variant`}
                  checked={variant === value}
                  onChange={() => setVariant(value)}
                />
                {t.logo.variants[value]}
              </label>
            ))}
          </fieldset>
          <fieldset className={styles.choices}>
            <legend>{t.logo.colours}</legend>
            {(Object.keys(LOGO_SCHEMES) as LogoScheme[]).map((value) => (
              <label key={value} className={styles.choice}>
                <input
                  type="radio"
                  name={`${id}-scheme`}
                  checked={scheme === value}
                  onChange={() => setScheme(value)}
                />
                {t.logo.schemes[value]}
              </label>
            ))}
          </fieldset>
          <div className={styles.printActions}>
            <ExportButton
              label={t.svg}
              item={name}
              busy={busy}
              id="svg-logo"
              onClick={() => download(`${file}.svg`, svg)}
            />
            <ExportButton
              label={t.png}
              item={name}
              busy={busy}
              id="png-logo"
              onClick={() => run('png-logo', async () => download(`${file}.png`, await svgToPng(svg, LOGO_PNG_WIDTH)))}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface ExportButtonProps {
  label: string;
  /** What it exports, for screen readers ("PNG: Invitation, a couple"). */
  item: string;
  id: string;
  busy: string | null;
  disabled?: boolean;
  onClick: () => void;
}

function ExportButton({ label, item, id, busy, disabled, onClick }: ExportButtonProps) {
  const t = useMessages(siteSettingsMessages).prints;
  return (
    <button
      type="button"
      className={formStyles.textButton}
      disabled={disabled || busy !== null}
      aria-label={t.downloadLabel(label, item)}
      onClick={onClick}
    >
      {busy === id ? '…' : label}
    </button>
  );
}
