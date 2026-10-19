import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { SUITS, type Suit } from '../../../services/game';
import { SuitCard } from '../components/SuitCard/SuitCard';
import { adminSuitPath } from '../game/suits';
import { useAuth } from '../useAuth';
import pageStyles from '../pages/pages.module.css';
import { SignupCodeForm } from './SignupCodeForm';
import styles from './admin.module.css';

const CAPTIONS: Record<Suit, string> = {
  hearts: 'Letters & scenes',
  diamonds: 'Letters & quiz',
  spades: 'Guess who',
  clubs: 'Letters & riddles',
};

/** Home of the private area for organisers: what to edit in each suit. */
export function AdminDashboard() {
  const { user, auth } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'organiser';

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="dashboard-title" eyebrow="Organisers" title={`Hello, ${firstName}!`} />
      <p className={pageStyles.center}>
        Prepare the game: choose a suit to edit the secret letters of its cards, the photo scenes of the hearts, the quiz
        of the diamonds, the people to find of the spades and the riddles of the clubs.
      </p>

      <section aria-labelledby="admin-suits-title">
        <h3 id="admin-suits-title" className={pageStyles.sectionTitle}>
          The four suits
        </h3>
        <div className={styles.suits}>
          {SUITS.map((suit) => (
            <SuitCard key={suit} suit={suit} to={adminSuitPath(suit)} caption={CAPTIONS[suit]} />
          ))}
        </div>
      </section>

      <SignupCodeForm />

      <button type="button" className={formStyles.secondary} onClick={() => auth.logout()}>
        Log out
      </button>
      <div className={pageStyles.links}>
        <Link to="/">Back to the wedding site</Link>
      </div>
    </div>
  );
}
