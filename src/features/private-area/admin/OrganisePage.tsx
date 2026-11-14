import { useCallback, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { RouteTabPanel, RouteTabs } from '../../../components/RouteTabs/RouteTabs';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { LOCALES, useLanguage, useMessages } from '../../../i18n';
import {
  cardTodos,
  openItems,
  suitProgress,
  type AdminCard,
  type AdminPerson,
  type AdminRepository,
  type SuitProgress,
} from '../../../services/admin';
import { editableSuits } from '../../../services/auth';
import { cardImageUrl, cardName, isSuit } from '../../../services/game';
import { daysUntil } from '../../../services/site';
import { useSiteContent } from '../../../site/SiteContentContext';
import { adminCardPath, organisePath, SITE_SETTINGS_PATH, SUIT_META } from '../game/suits';
import { adminMessages } from '../messages/admin';
import { siteSettingsMessages } from '../messages/siteSettings';
import { AreaLayout } from '../pages/AreaLayout';
import pageStyles from '../pages/pages.module.css';
import { useAuth } from '../useAuth';
import styles from './admin.module.css';
import { PeopleEditor } from './PeopleEditor';
import { useAdminQuery } from './useAdminQuery';
import { useTodoText } from './useTodoText';

interface SuitData {
  cards: AdminCard[];
  progress: SuitProgress;
}

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
  // A string, so the loader stays the same between renders.
  const suitsKey = editableSuits(user).join(',');
  const load = useCallback((repository: AdminRepository) => loadSuits(repository, suitsKey), [suitsKey]);
  const query = useAdminQuery(load);
  // The people of the spades, once edited here (the overview counts them).
  const [people, setPeople] = useState<AdminPerson[] | null>(null);
  const param = useParams().suit;

  // /area/admin/<suit>: one suit per sub-tab; none or another one shows the first.
  const editable = suitsKey.split(',').filter(isSuit);
  const suit = editable.find((item) => item === param) ?? editable[0];

  const names = editable.map((item) => SUIT_META[item].label.toLowerCase());
  const list = new Intl.ListFormat(LOCALES[language], { type: 'conjunction' }).format(names);

  if (!suit) return null;
  if (param !== suit) return <Navigate to={organisePath(suit)} replace />;

  const suits =
    query.status === 'success'
      ? query.data.map((data) =>
          data.progress.suit === 'spades' && people
            ? { ...data, progress: suitProgress('spades', data.cards, people) }
            : data,
        )
      : [];
  const selected = suits.find((data) => data.progress.suit === suit);

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
          <Overview suits={suits.map((data) => data.progress)} />
          <RouteTabs
            id="organise-suits"
            label={t.suitsLabel}
            current={suit}
            tabs={suits.map(({ progress }) => ({
              id: progress.suit,
              label: (
                <>
                  {SUIT_META[progress.suit].symbol} {SUIT_META[progress.suit].label}
                  {openItems(progress) > 0 && (
                    <span className={styles.tabCount} aria-label={t.toSet(openItems(progress))}>
                      {openItems(progress)}
                    </span>
                  )}
                </>
              ),
              to: organisePath(progress.suit),
            }))}
          />
          <RouteTabPanel id="organise-suits" current={suit} className={styles.suitSection}>
            {selected && <SuitSection {...selected} onPeopleChange={setPeople} />}
          </RouteTabPanel>
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
            <Link to={organisePath(progress.suit)}>
              {SUIT_META[progress.suit].symbol} {SUIT_META[progress.suit].label}
            </Link>
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

function SuitSection({
  cards,
  progress,
  onPeopleChange,
}: SuitData & { onPeopleChange: (people: AdminPerson[]) => void }) {
  const messages = useMessages(adminMessages);
  const t = messages.organise;
  const { suit } = progress;
  const { label, symbol } = SUIT_META[suit];

  return (
    <>
      <h3 className={pageStyles.sectionTitle}>
        {symbol} {label}
      </h3>
      <p className={styles.help}>{messages.suitPage.help[suit]}</p>

      {/* Spades have nothing to set per card: their people to find, edited right here. */}
      {suit === 'spades' ? (
        <PeopleEditor onChange={onPeopleChange} />
      ) : (
        <>
          <p className={styles.help}>{t.legend}</p>
          <ul className={styles.cardGrid} aria-label={t.cards(label.toLowerCase())}>
            {cards.map((card) => (
              <li key={card.id}>
                <AdminCardTile card={card} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
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
