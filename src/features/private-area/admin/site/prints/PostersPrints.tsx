import { useCallback, useEffect, useId, useState } from 'react';
import formStyles from '../../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../../i18n';
import { download, printDocument, printHtml, svgFile } from '../../../../../prints/output';
import { POSTER_PAGE, posterSvg } from '../../../../../prints/posters';
import { qrSvg } from '../../../../../prints/qr';
import { toAdminError } from '../../../../../services/admin';
import { cardImageUrl, cardName, type Rank } from '../../../../../services/game';
import { printMessages } from '../../../messages/prints';
import { useAuth } from '../../../useAuth';
import { useAdminRepository } from '../../AdminRepositoryContext';
import { ExportButton } from './ExportButton';
import styles from './prints.module.css';

interface Poster {
  rank: Rank;
  name: string;
  ready: boolean;
  svg: string;
}

type State = { status: 'loading' } | { status: 'ready'; posters: Poster[] } | { status: 'error'; message: string };

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

/** One A3 poster per club: the card and the QR code of its riddle (secret codes: super admins only). */
export function PostersPrints({ url }: { url: string }) {
  const t = useMessages(printMessages);
  const repository = useAdminRepository();
  const { auth } = useAuth();
  const id = useId();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    repository
      .getRiddleCodes()
      .then((codes) =>
        Promise.all(
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
        ),
      )
      .then(
        (posters) => current && setState({ status: 'ready', posters }),
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
  }, [repository, auth, url, attempt, t]);

  const run = useCallback(async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  }, []);

  const posters = state.status === 'ready' ? state.posters : null;
  const notReady = posters?.filter((poster) => !poster.ready).length ?? 0;

  return (
    <section className={styles.group} aria-labelledby={`${id}-title`}>
      <div className={styles.groupHead}>
        <h4 id={`${id}-title`} className={styles.title}>
          {t.posters.title}
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
      <p className={formStyles.hint}>{t.posters.hint}</p>
      {state.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {t.failed} {state.message}
        </div>
      )}
      {posters && (
        <>
          <p role="status" className={notReady > 0 ? styles.warning : styles.allReady}>
            {notReady > 0 ? t.posters.notReady(notReady) : t.posters.ready}
          </p>
          <div className={styles.actions}>
            <ExportButton
              label={t.printAll}
              item={t.posters.title}
              busy={busy}
              id="print-posters"
              onClick={() =>
                run('print-posters', () =>
                  printHtml(
                    printDocument(
                      posters.map((poster) => poster.svg),
                      POSTER_PAGE,
                      t.posters.title,
                    ),
                  ),
                )
              }
            />
          </div>
          <ul className={styles.posters}>
            {posters.map((poster) => {
              const name = t.posters.name(poster.name);
              return (
                <li key={poster.rank} className={`${styles.item} ${poster.ready ? '' : styles.posterTodo}`}>
                  {/* Our own SVG (every text escaped): inline, so it uses the page's fonts. */}
                  <div
                    className={styles.posterPreview}
                    role="img"
                    aria-label={name}
                    dangerouslySetInnerHTML={{ __html: poster.svg }}
                  />
                  <span className={styles.caption}>
                    {poster.name}
                    {!poster.ready && <span className={styles.warning}> · {t.posters.missing}</span>}
                  </span>
                  <div className={styles.actions}>
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
                        run(`print-poster-${poster.rank}`, () =>
                          printHtml(printDocument([poster.svg], POSTER_PAGE, name)),
                        )
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
  );
}
