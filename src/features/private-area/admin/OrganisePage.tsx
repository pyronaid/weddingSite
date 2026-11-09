import { useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { LOCALES, useLanguage, useMessages } from '../../../i18n';
import {
  cardTodos,
  openItems,
  suitProgress,
  type AdminCard,
  type AdminRepository,
  type SuitProgress,
} from '../../../services/admin';
import { editableSuits } from '../../../services/auth';
import { cardImageUrl, cardName, isSuit, type Suit } from '../../../services/game';
import { daysUntil } from '../../../services/site';
import { useSiteContent } from '../../../site/SiteContentContext';
import { adminCardPath, adminSuitPath, SITE_SETTINGS_PATH, SUIT_META } from '../game/suits';
import { adminMessages } from '../messages/admin';
import { siteSettingsMessages } from '../messages/siteSettings';
import { AreaLayout } from '../pages/AreaLayout';
import pageStyles from '../pages/pages.module.css';
import { useAuth } from '../useAuth';
import styles from './admin.module.css';
import { useAdminQuery } from './useAdminQuery';
import { useTodoText } from './useTodoText';

interface SuitData {
  cards: AdminCard[];
  progress: SuitProgress;
}

const suitAnchor = (suit: Suit) => `suit-${suit}`;

/** The cards of each suit ("clubs,hearts"), and the people to find for the spades. */
function loadSuits(repository: AdminRepository, suitsKey: string): Promise<SuitData[]> {
  return Promise.all(
    suitsKey
      .split(',')
      .filter(isSuit)
      .map(async (suit) => {
        const [cards, people] = await Promise.all([
          repository.getSuit(suit),
          suit === 'spades' ? repository.getPeople() : Promise.resolve(undefined),
        ]);
        return { cards, progress: suitProgress(suit, cards, people) };
      }),
  );
}

/**
 * The organisers' tab of the private area home: how much is left before the
 * wedding, then every suit they edit as its cards (like the guests see
 * them). A red border marks a card with something missing; a card opens its
 * editor. Spades have nothing per card: their people to find instead.
 */
export function OrganisePage() {
  const messages = useMessages(adminMessages);
  const t = messages.organise;
  useDocumentTitle(t.title);
  const { user } = useAuth();
  const site = useMessages(siteSettingsMessages);
  const language = useLanguage();
  const location = useLocation();

  // A string, so the loader stays the same between renders.
  const suitsKey = editableSuits(user).join(',');
  const load = useCallback((repository: AdminRepository) => loadSuits(repository, suitsKey), [suitsKey]);
  const query = useAdminQuery(load);

  // /area/admin#suit-clubs (e.g. back from a card): scroll to that suit once it is there.
  const loaded = query.status === 'success';
  useEffect(() => {
    if (loaded && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView?.();
  }, [loaded, location.hash]);

  const names = suitsKey
    .split(',')
    .filter(isSuit)
    .map((suit) => SUIT_META[suit].label.toLowerCase());
  const list = new Intl.ListFormat(LOCALES[language], { type: 'conjunction' }).format(names);

  return (
    <AreaLayout current="organise">
      <p className={pageStyles.center}>{user?.isSuperAdmin ? t.introAll : t.introSome(list)}</p>

      {/* The bride and groom: content, photos, organisers, RSVPs, sign-up code and prints. */}
      {user?.isSuperAdmin && (
        <Link to={SITE_SETTINGS_PATH} className={styles.siteLink}>
          <span className={styles.siteLinkTitle}>⚙︎ {site.linkTitle}</span>
          <span>{site.linkText}</span>
        </Link>
      )}

      {query.status === 'loading' && (
        <p className={styles.help} role="status">
          {t.loading}
        </p>
      )}
      {query.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {query.error.message}{' '}
          <button type="button" className={formStyles.textButton} onClick={query.retry}>
            {messages.common.tryAgain}
          </button>
        </div>
      )}
      {query.status === 'success' && (
        <>
          <Overview suits={query.data.map((data) => data.progress)} />
          <p className={styles.help}>{t.legend}</p>
          {query.data.map((data) => (
            <SuitSection key={data.progress.suit} {...data} />
          ))}
        </>
      )}
    </AreaLayout>
  );
}

/** Days to the wedding, things left, and how each suit stands. */
function Overview({ suits }: { suits: SuitProgress[] }) {
  const t = useMessages(adminMessages).organise;
  const { content } = useSiteContent();
  const days = daysUntil(content.date, content.timezone);
  const remaining = suits.reduce((sum, suit) => sum + openItems(suit), 0);

  return (
    <section className={styles.overview} aria-labelledby="overview-title">
      <h3 id="overview-title" className={styles.panelTitle}>
        {t.overview}
      </h3>
      {days !== null && <p className={styles.days}>{t.daysLeft(days)}</p>}
      <p className={remaining === 0 ? styles.allSet : styles.remaining}>{t.remaining(remaining)}</p>
      <ul className={styles.overviewList}>
        {suits.map((progress) => (
          <li key={progress.suit} className={openItems(progress) > 0 ? styles.suitOpen : undefined}>
            <a href={`#${suitAnchor(progress.suit)}`}>
              {SUIT_META[progress.suit].symbol} {SUIT_META[progress.suit].label}
            </a>
            {': '}
            {progress.suit === 'spades'
              ? t.peopleTodo(progress.people ?? 0)
              : t.suitTodo(progress.todo.length, progress.total)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SuitSection({ cards, progress }: SuitData) {
  const messages = useMessages(adminMessages);
  const t = messages.organise;
  const { suit } = progress;
  const { label, symbol } = SUIT_META[suit];
  const titleId = `${suitAnchor(suit)}-title`;

  return (
    <section id={suitAnchor(suit)} className={styles.suitSection} aria-labelledby={titleId}>
      <h3 id={titleId} className={pageStyles.sectionTitle}>
        {symbol} {label}
      </h3>
      <p className={styles.help}>{messages.suitPage.help[suit]}</p>

      {suit === 'spades' ? (
        <div className={styles.peopleSummary}>
          <p className={openItems(progress) > 0 ? styles.remaining : styles.allSet}>
            {t.peopleTodo(progress.people ?? 0)}
          </p>
          <Link to={adminSuitPath('spades')} className={formStyles.secondary}>
            {t.editPeople}
          </Link>
        </div>
      ) : (
        <ul className={styles.cardGrid} aria-label={t.cards(label.toLowerCase())}>
          {cards.map((card) => (
            <li key={card.id}>
              <AdminCardTile card={card} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A card as the guests see it, red-framed while something is missing; opens its editor. */
function AdminCardTile({ card }: { card: AdminCard }) {
  const t = useMessages(adminMessages).organise;
  const todoText = useTodoText();
  const todos = cardTodos(card);
  const name = cardName(card.rank, card.suit);

  return (
    <Link
      to={adminCardPath(card.suit, card.rank)}
      className={`${styles.tile} ${todos.length > 0 ? styles.tileTodo : styles.tileDone}`}
      aria-label={t.cardLabel(name, todos.length > 0 ? todoText(todos) : '')}
    >
      <img src={cardImageUrl(card.suit, card.rank)} alt="" loading="lazy" decoding="async" draggable={false} />
      <span className={styles.tileMark} aria-hidden="true">
        {todos.length > 0 ? todos.length : '✓'}
      </span>
    </Link>
  );
}
