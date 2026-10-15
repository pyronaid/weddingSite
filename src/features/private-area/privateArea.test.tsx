import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { AuthError, type AuthService, type AuthUser } from '../../services/auth';
import { GameError, type GameProgress, type GameRepository, type PlayingCard, type Riddle, type Suit } from '../../services/game';
import { AuthProvider } from './AuthProvider';
import { GameRepositoryProvider } from './game/GameRepositoryContext';
import { GuestOnly, RequireAuth } from './guards';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RiddlePage } from './pages/RiddlePage';
import { SuitPage } from './pages/SuitPage';

/** In-memory AuthService: lets us drive the UI without a backend. */
function createFakeAuth(overrides: Partial<AuthService> = {}) {
  let user: AuthUser | null = null;
  const listeners = new Set<() => void>();
  const setUser = (next: AuthUser | null) => {
    user = next;
    listeners.forEach((l) => l());
  };
  const service: AuthService = {
    getCurrentUser: () => user,
    subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
    login: vi.fn(async (email: string) => {
      const next = { id: '1', email, name: 'Anna Verdi', verified: true };
      setUser(next);
      return next;
    }),
    logout: vi.fn(() => setUser(null)),
    refresh: vi.fn(async () => {}),
    signUp: vi.fn(async () => {}),
    requestVerification: vi.fn(async () => {}),
    confirmVerification: vi.fn(async () => {}),
    requestPasswordReset: vi.fn(async () => {}),
    confirmPasswordReset: vi.fn(async () => {}),
    ...overrides,
  };
  return service;
}

const progress: GameProgress = {
  hearts: { collected: 3, total: 13 },
  diamonds: { collected: 0, total: 13 },
  spades: { collected: 13, total: 13 },
  clubs: { collected: 1, total: 13 },
};

const LETTERS = 'WEDDINGFUN';
/** All the cards of a suit; the 6 (letter "N") and the King are collected. */
const suitCards = (suit: Suit): PlayingCard[] =>
  Array.from({ length: 13 }, (_, i) => {
    const rank = i + 1;
    const collected = rank === 6 || rank === 13;
    return { id: `${suit}${rank}`, suit, rank, collected, letter: collected && rank <= 10 ? LETTERS[i] : null };
  });
const clubs = suitCards('clubs');

const riddle: Riddle = {
  suit: 'clubs',
  rank: 7,
  text: 'Lorem ipsum dolor sit amet.',
  length: 5,
  collected: false,
  letter: null,
};

function createFakeGame(overrides: Partial<GameRepository> = {}): GameRepository {
  return {
    getProgress: vi.fn(async () => progress),
    getSuitCards: vi.fn(async (suit: Suit) => suitCards(suit)),
    getRiddle: vi.fn(async () => riddle),
    solveRiddle: vi.fn(async (_code: string, answer: string) =>
      answer === 'APPLE' ? { correct: true, collected: true, letter: 'G' } : { correct: false, collected: false, letter: null },
    ),
    ...overrides,
  };
}

function renderArea(service: AuthService, initialPath: string, game: GameRepository = createFakeGame()) {
  const router = createMemoryRouter(
    [
      {
        path: '/area',
        // Stand-in for PrivateAreaRoot: same provider, no animations/photos.
        element: (
          <AuthProvider service={service}>
            <GameRepositoryProvider value={game}>
              <Outlet />
            </GameRepositoryProvider>
          </AuthProvider>
        ),
        children: [
          {
            element: <RequireAuth />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'suits/:suit', element: <SuitPage /> },
              { path: 'riddles/:code', element: <RiddlePage /> },
            ],
          },
          { element: <GuestOnly />, children: [{ path: 'login', element: <LoginPage /> }] },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

async function fillAndSubmit(email = 'anna@example.com', password = 'password123') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^e-mail$/i), email);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.click(screen.getByRole('button', { name: /^log in$/i }));
  return user;
}

describe('private area', () => {
  it('sends anonymous visitors to the login page, then back after logging in', async () => {
    const auth = createFakeAuth();
    const router = renderArea(auth, '/area');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    await fillAndSubmit();

    expect(await screen.findByRole('heading', { name: /hello, anna/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/area');
    expect(auth.login).toHaveBeenCalledWith('anna@example.com', 'password123');
  });

  it('validates the form locally before calling the backend', async () => {
    const auth = createFakeAuth();
    renderArea(auth, '/area/login');
    await userEvent.setup().click(await screen.findByRole('button', { name: /^log in$/i }));
    expect(screen.getByText(/please enter your e-mail/i)).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('offers to resend the confirmation e-mail when the account is not verified', async () => {
    const auth = createFakeAuth({
      login: vi.fn().mockRejectedValue(new AuthError('email_not_verified', 'Please confirm your e-mail address.')),
    });
    renderArea(auth, '/area/login');
    await screen.findByRole('heading', { name: /welcome back/i });
    const user = await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/confirm your e-mail/i);
    await user.click(screen.getByRole('button', { name: /resend confirmation/i }));
    expect(auth.requestVerification).toHaveBeenCalledWith('anna@example.com');
    expect(await screen.findByRole('button', { name: /resend e-mail \(60s\)/i })).toBeDisabled();
  });

  it('logs out from the dashboard', async () => {
    const auth = createFakeAuth();
    await auth.login('anna@example.com', 'x');
    renderArea(auth, '/area');
    await userEvent.setup().click(await screen.findByRole('button', { name: /log out/i }));
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  describe('card game', () => {
    async function loggedIn() {
      const auth = createFakeAuth();
      await auth.login('anna@example.com', 'x');
      return auth;
    }

    it('shows the collected cards of each suit, linking to the suit page', async () => {
      const router = renderArea(await loggedIn(), '/area');

      const hearts = await screen.findByRole('link', { name: 'Hearts: 3 of 13 cards collected' });
      expect(hearts).toHaveTextContent('3/13');
      expect(screen.getByRole('link', { name: 'Diamonds: 0 of 13 cards collected' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Spades: 13 of 13 cards collected' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Clubs: 1 of 13 cards collected' })).toBeInTheDocument();

      await userEvent.setup().click(hearts);
      expect(await screen.findByRole('heading', { name: 'Hearts' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/area/suits/hearts');
    });

    it('requires a login for suit pages, then returns to the requested one', async () => {
      const router = renderArea(createFakeAuth(), '/area/suits/spades');
      expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      await fillAndSubmit();
      expect(await screen.findByRole('heading', { name: 'Spades' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/area/suits/spades');
    });

    it('redirects an unknown suit to the dashboard', async () => {
      const router = renderArea(await loggedIn(), '/area/suits/jokers');
      expect(await screen.findByRole('heading', { name: /hello, anna/i })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/area');
    });

    it('shows an error with a retry when the progress cannot be loaded', async () => {
      const getProgress = vi
        .fn<GameRepository['getProgress']>()
        .mockRejectedValueOnce(new GameError('network', 'Unable to reach the server.'))
        .mockResolvedValueOnce(progress);
      renderArea(await loggedIn(), '/area', createFakeGame({ getProgress }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach the server/i);
      expect(screen.getByRole('link', { name: 'Hearts: progress not available' })).toHaveTextContent('–/–');

      await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));
      expect(await screen.findByRole('link', { name: 'Hearts: 3 of 13 cards collected' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(getProgress).toHaveBeenCalledTimes(2);
    });

    it('logs out when the server rejects the session', async () => {
      const auth = await loggedIn();
      const game = createFakeGame({ getProgress: vi.fn().mockRejectedValue(new GameError('unauthenticated', 'Session expired.')) });
      renderArea(auth, '/area', game);
      expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(auth.logout).toHaveBeenCalled();
    });

    it.each([
      ['hearts', 'Hearts'],
      ['diamonds', 'Diamonds'],
      ['spades', 'Spades'],
      ['clubs', 'Clubs'],
    ] as const)('shows the cards and the secret phrase on the %s page', async (suit, label) => {
      const game = createFakeGame();
      renderArea(await loggedIn(), `/area/suits/${suit}`, game);

      const list = await screen.findByRole('list', { name: `${label} cards` });
      expect(within(list).getAllByRole('button')).toHaveLength(13);
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `6 of ${suit}, collected` })).toBeInTheDocument();
      expect(screen.getByText(/-----N---- — 1 of 10 letters found/)).toBeInTheDocument();
      expect(game.getSuitCards).toHaveBeenCalledWith(suit);
    });

    describe('clubs page', () => {
      it('lists every club in order, marks the collected ones and shows the secret phrase', async () => {
        const game = createFakeGame();
        renderArea(await loggedIn(), '/area/suits/clubs', game);

        const list = await screen.findByRole('list', { name: 'Clubs cards' });
        const cards = within(list).getAllByRole('button');
        expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
          'Ace of clubs, not collected',
          ...[2, 3, 4, 5].map((n) => `${n} of clubs, not collected`),
          '6 of clubs, collected',
          ...[7, 8, 9, 10].map((n) => `${n} of clubs, not collected`),
          'Jack of clubs, not collected',
          'Queen of clubs, not collected',
          'King of clubs, collected',
        ]);
        expect(game.getSuitCards).toHaveBeenCalledWith('clubs');
        expect(screen.getByText(/-----N---- — 1 of 10 letters found/)).toBeInTheDocument();
        expect(screen.getByText('2/13 cards collected')).toBeInTheDocument();
      });

      it('flips a card on click to show its letter, or a star for face cards', async () => {
        renderArea(await loggedIn(), '/area/suits/clubs');
        const user = userEvent.setup();

        const six = await screen.findByRole('button', { name: '6 of clubs, collected' });
        await user.click(six);
        expect(six).toHaveAttribute('aria-pressed', 'true');
        expect(six).toHaveAccessibleName('6 of clubs, collected, showing the card back with the letter N');

        const king = screen.getByRole('button', { name: 'King of clubs, collected' });
        await user.click(king);
        expect(king).toHaveAccessibleName('King of clubs, collected, showing the card back with a star');

        const ace = screen.getByRole('button', { name: 'Ace of clubs, not collected' });
        await user.click(ace);
        expect(ace).toHaveAccessibleName('Ace of clubs, not collected, showing the card back');

        await user.click(six);
        expect(six).toHaveAttribute('aria-pressed', 'false');
      });

      it('shows an error with a retry when the cards cannot be loaded', async () => {
        const getSuitCards = vi
          .fn<GameRepository['getSuitCards']>()
          .mockRejectedValueOnce(new GameError('network', 'Unable to reach the server.'))
          .mockResolvedValueOnce(clubs);
        renderArea(await loggedIn(), '/area/suits/clubs', createFakeGame({ getSuitCards }));

        expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach the server/i);
        await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));
        expect(await screen.findByRole('list', { name: 'Clubs cards' })).toBeInTheDocument();
      });
    });

    describe('riddle page', () => {
      const typeAnswer = async (user: ReturnType<typeof userEvent.setup>, answer: string) => {
        await user.click(await screen.findByRole('textbox', { name: 'Letter 1 of 5' }));
        await user.keyboard(answer);
      };

      it('requires a login, then shows the riddle of the QR code', async () => {
        const game = createFakeGame();
        const router = renderArea(createFakeAuth(), '/area/riddles/abc123xyz789', game);
        expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
        await fillAndSubmit();

        expect(await screen.findByRole('heading', { name: '7 of Clubs' })).toBeInTheDocument();
        expect(screen.getByText('Lorem ipsum dolor sit amet.')).toBeInTheDocument();
        expect(screen.getAllByRole('textbox')).toHaveLength(5);
        expect(router.state.location.pathname).toBe('/area/riddles/abc123xyz789');
        expect(game.getRiddle).toHaveBeenCalledWith('abc123xyz789');
      });

      it('collects the card when the answer is right', async () => {
        const game = createFakeGame();
        renderArea(await loggedIn(), '/area/riddles/abc123xyz789', game);
        const user = userEvent.setup();

        const submit = await screen.findByRole('button', { name: 'Submit' });
        expect(submit).toBeDisabled();
        await typeAnswer(user, 'apple');
        expect(submit).toBeEnabled();
        await user.click(submit);

        expect(game.solveRiddle).toHaveBeenCalledWith('abc123xyz789', 'APPLE');
        expect(await screen.findByText(/you collected the 7 of clubs/i)).toBeInTheDocument();
        expect(screen.getByText('G')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'See your clubs' })).toHaveAttribute('href', '/area/suits/clubs');
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });

      it('says when the answer is wrong and lets the guest try again', async () => {
        renderArea(await loggedIn(), '/area/riddles/abc123xyz789');
        const user = userEvent.setup();
        await typeAnswer(user, 'pearl');
        await user.keyboard('{Enter}');

        expect(await screen.findByText(/not quite/i)).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Letter 1 of 5' })).toHaveAttribute('aria-invalid', 'true');

        // Editing the answer clears the message.
        await user.click(screen.getByRole('textbox', { name: 'Letter 1 of 5' }));
        await user.keyboard('a');
        expect(screen.queryByText(/not quite/i)).not.toBeInTheDocument();
      });

      it('shows the card as collected when the riddle was already solved', async () => {
        const game = createFakeGame({ getRiddle: vi.fn(async () => ({ ...riddle, rank: 12, collected: true })) });
        renderArea(await loggedIn(), '/area/riddles/abc123xyz789', game);
        expect(await screen.findByText(/you collected the queen of clubs/i)).toBeInTheDocument();
        expect(screen.getByText('★')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
      });

      it('explains when the QR code points to an unknown riddle', async () => {
        const game = createFakeGame({
          getRiddle: vi.fn().mockRejectedValue(new GameError('not_found', 'This riddle does not exist or is not available yet.')),
        });
        renderArea(await loggedIn(), '/area/riddles/nope', game);
        expect(await screen.findByRole('alert')).toHaveTextContent(/does not exist/i);
        expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      });
    });
  });
});
