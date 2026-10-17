import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { AuthError, type AuthService, type AuthUser } from '../../services/auth';
import { GameError, type GameProgress, type GalleryPhoto, type GameRepository, type PlayingCard, type Riddle, type Suit } from '../../services/game';
import { AuthProvider } from './AuthProvider';
import { GameRepositoryProvider } from './game/GameRepositoryContext';
import { GuestOnly, RequireAdmin, RequireAuth } from './guards';
import { DashboardPage } from './pages/DashboardPage';
import { GalleryPage } from './pages/GalleryPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AdminRepositoryProvider } from './admin/AdminRepositoryContext';
import { AdminSuitPage } from './admin/AdminSuitPage';
import { AdminError, type AdminCard, type AdminRepository } from '../../services/admin';
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
      const next = { id: '1', email, name: 'Anna Verdi', verified: true, isAdmin: email.startsWith('admin') };
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

const fullLives = { lives: 3, maxLives: 3, penalties: 0 };
const quizQuestion = (id: string) => ({
  questionId: id,
  text: `Question ${id} about the couple?`,
  answers: [
    { id: `${id}-wrong`, text: `Wrong answer of ${id}` },
    { id: `${id}-right`, text: `Right answer of ${id}` },
  ],
});

function createFakeGame(overrides: Partial<GameRepository> = {}): GameRepository {
  return {
    getProgress: vi.fn(async () => progress),
    getSuitCards: vi.fn(async (suit: Suit) => suitCards(suit)),
    getRiddle: vi.fn(async () => riddle),
    solveRiddle: vi.fn(async (_code: string, answer: string) =>
      answer === 'APPLE' ? { correct: true, collected: true, letter: 'G' } : { correct: false, collected: false, letter: null },
    ),
    drawPhotoScene: vi.fn(async () => ({ submissionId: 's1', scene: 'Someone dancing barefoot', locked: false, photoUrl: null })),
    uploadPhoto: vi.fn(async () => {}),
    getGallery: vi.fn(async () => ({ items: [], hasMore: false })),
    getGalleryUpdates: vi.fn(async () => []),
    getFileToken: vi.fn(async () => ({ token: 'file-token', expiresAt: Date.now() + 3_600_000 })),
    getQuizStatus: vi.fn(async () => ({ lives: 3, maxLives: 3, penalties: 0 })),
    getQuizQuestion: vi.fn(async () => ({ solved: false as const, question: quizQuestion('q1'), status: fullLives })),
    answerQuiz: vi.fn(async (_card: string, _question: string, answerId: string) =>
      answerId.endsWith('-right')
        ? { correct: true as const, letter: 'D', status: fullLives }
        : { correct: false as const, stale: false, question: quizQuestion('q2'), status: { ...fullLives, lives: 2 } },
    ),
    ...overrides,
  };
}

const adminClubs: AdminCard[] = Array.from({ length: 13 }, (_, i) => ({
  id: `c${i + 1}`,
  suit: 'clubs',
  rank: i + 1,
  letter: i < 10 ? 'WEDDINGFUN'[i] : '',
  riddle: `Riddle ${i + 1}`,
  solution: i === 6 ? 'APPLE' : '',
}));
const adminDiamonds: AdminCard[] = Array.from({ length: 13 }, (_, i) => ({
  id: `d${i + 1}`,
  suit: 'diamonds',
  rank: i + 1,
  letter: '',
  questions: [
    {
      id: `dq${i + 1}`,
      text: `Where did they meet? (${i + 1})`,
      answers: [
        { id: `dq${i + 1}-a`, text: 'At a party', correct: true },
        { id: `dq${i + 1}-b`, text: 'On a train', correct: false },
      ],
    },
  ],
}));
const adminHearts: AdminCard[] = Array.from({ length: 13 }, (_, i) => ({
  id: `h${i + 1}`,
  suit: 'hearts',
  rank: i + 1,
  letter: '',
  ...(i < 10 ? { scenes: [{ id: `s${i + 1}`, text: `Scene of the ${i + 1}` }] } : {}),
}));

function createFakeAdmin(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    getSuit: vi.fn(async (suit: Suit) =>
      suit === 'clubs' ? adminClubs : suit === 'hearts' ? adminHearts : suit === 'diamonds' ? adminDiamonds : [],
    ),
    updateCard: vi.fn(async (cardId: string, changes) => ({
      ...adminClubs.find((card) => card.id === cardId)!,
      ...changes,
      ...(changes.letter !== undefined ? { letter: changes.letter.toUpperCase() } : {}),
      ...(changes.solution !== undefined ? { solution: changes.solution.replace(/\s+/g, '').toUpperCase() } : {}),
    })),
    addScene: vi.fn(async (_cardId: string, text: string) => ({ id: 'new-scene', text })),
    updateScene: vi.fn(async (sceneId: string, text: string) => ({ id: sceneId, text })),
    deleteScene: vi.fn(async () => {}),
    addQuestion: vi.fn(async (_cardId: string, question) => ({
      id: 'new-q',
      text: question.text,
      answers: question.answers.map((answer: { text: string; correct: boolean }, index: number) => ({ id: `new-a${index}`, ...answer })),
    })),
    updateQuestion: vi.fn(async (id: string, text: string) => ({ ...adminDiamonds[4].questions![0], id, text })),
    deleteQuestion: vi.fn(async () => {}),
    addAnswer: vi.fn(async (_questionId: string, answer) => ({
      ...adminDiamonds[4].questions![0],
      answers: [...adminDiamonds[4].questions![0].answers, { id: 'dq5-c', text: answer.text, correct: false }],
    })),
    updateAnswer: vi.fn(async (answerId: string, changes) => ({
      ...adminDiamonds[4].questions![0],
      answers: adminDiamonds[4].questions![0].answers.map((answer) => ({
        ...answer,
        correct: changes.correct ? answer.id === answerId : answer.correct,
      })),
    })),
    deleteAnswer: vi.fn(async () => adminDiamonds[4].questions![0]),
    getSettings: vi.fn(async () => ({ signupCode: '#wedding' })),
    updateSettings: vi.fn(async (settings) => settings),
    ...overrides,
  };
}

function renderArea(
  service: AuthService,
  initialPath: string,
  game: GameRepository = createFakeGame(),
  admin: AdminRepository = createFakeAdmin(),
) {
  const router = createMemoryRouter(
    [
      {
        path: '/area',
        // Stand-in for PrivateAreaRoot: same provider, no animations/photos.
        element: (
          <AuthProvider service={service}>
            <GameRepositoryProvider value={game}>
              <AdminRepositoryProvider value={admin}>
                <Outlet />
              </AdminRepositoryProvider>
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
              { path: 'gallery', element: <GalleryPage /> },
            ],
          },
          { element: <RequireAdmin />, children: [{ path: 'admin/suits/:suit', element: <AdminSuitPage /> }] },
          {
            element: <GuestOnly />,
            children: [
              { path: 'login', element: <LoginPage /> },
              { path: 'signup', element: <SignupPage /> },
            ],
          },
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
      expect(within(list).getAllByRole('listitem')).toHaveLength(13);
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

    describe('hearts photo challenge', () => {
      const photoFile = () => new File(['fake-jpeg'], 'party.jpg', { type: 'image/jpeg' });

      beforeEach(() => {
        // jsdom has no object URLs (used for the preview).
        URL.createObjectURL = vi.fn(() => 'blob:preview');
        URL.revokeObjectURL = vi.fn();
      });

      it('draws a scene on every press and collects the card on upload', async () => {
        const draws = ['Someone dancing barefoot', 'A group selfie with at least five people'];
        const game = createFakeGame({
          drawPhotoScene: vi.fn(async () => ({ submissionId: 's5', scene: draws.shift()!, locked: false, photoUrl: null })),
        });
        renderArea(await loggedIn(), '/area/suits/hearts', game);
        const user = userEvent.setup();

        const button = await screen.findByRole('button', { name: 'Photo challenge for the 5 of hearts' });
        await user.click(button);
        const dialog = await screen.findByRole('dialog', { name: 'Photo challenge · 5 of hearts' });
        expect(await within(dialog).findByText('Someone dancing barefoot')).toBeInTheDocument();

        // Closing and pressing again draws a new scene.
        await user.click(within(dialog).getByRole('button', { name: 'Close' }));
        await user.click(button);
        expect(await screen.findByText('A group selfie with at least five people')).toBeInTheDocument();
        expect(game.drawPhotoScene).toHaveBeenCalledTimes(2);
        expect(game.drawPhotoScene).toHaveBeenCalledWith('hearts5');

        const upload = screen.getByRole('button', { name: 'Upload photo' });
        expect(upload).toBeDisabled();
        await user.upload(screen.getByLabelText('Take or choose a photo'), photoFile());
        expect(screen.getByRole('img', { name: 'The photo you selected' })).toBeInTheDocument();
        await user.click(upload);

        expect(await screen.findByText('Photo uploaded! 🎉')).toBeInTheDocument();
        expect(game.uploadPhoto).toHaveBeenCalledWith('s5', expect.any(File));
        // The cards are reloaded in the background to show the new state.
        await waitFor(() => expect(game.getSuitCards).toHaveBeenCalledTimes(2));
      });

      it('keeps the scene of an uploaded photo: only the photo can change', async () => {
        const game = createFakeGame({
          drawPhotoScene: vi.fn(async () => ({
            submissionId: 's6',
            scene: 'The groom dancing with at least three girls',
            locked: true,
            photoUrl: 'http://pb/thumb.jpg',
          })),
        });
        renderArea(await loggedIn(), '/area/suits/hearts', game);
        const user = userEvent.setup();

        // The 6 of hearts is collected in the fake data: "Change photo".
        await user.click(await screen.findByRole('button', { name: 'Change the photo for the 6 of hearts' }));
        expect(await screen.findByText(/the scene stays the same/i)).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Your current photo' })).toHaveAttribute('src', 'http://pb/thumb.jpg');
        expect(screen.getByLabelText('Choose a new photo')).toBeInTheDocument();
      });

      it('shows why an upload failed', async () => {
        const game = createFakeGame({
          uploadPhoto: vi.fn().mockRejectedValue(new GameError('invalid_photo', 'This photo cannot be uploaded.')),
        });
        renderArea(await loggedIn(), '/area/suits/hearts', game);
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: 'Photo challenge for the 2 of hearts' }));
        await user.upload(await screen.findByLabelText('Take or choose a photo'), photoFile());
        await user.click(screen.getByRole('button', { name: 'Upload photo' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('This photo cannot be uploaded.');
      });

      it('shows the rules and links to the gallery', async () => {
        renderArea(await loggedIn(), '/area/suits/hearts');
        const rules = await screen.findByRole('region', { name: 'Rules' });
        expect(rules).toHaveTextContent(/checked against the scene it was assigned/i);
        expect(screen.getByRole('link', { name: /see everyone's photos/i })).toHaveAttribute('href', '/area/gallery');
      });

      it('explains why a file that is not a photo is refused', async () => {
        const game = createFakeGame();
        renderArea(await loggedIn(), '/area/suits/hearts', game);
        const user = userEvent.setup({ applyAccept: false });
        await user.click(await screen.findByRole('button', { name: 'Photo challenge for the 2 of hearts' }));
        await user.upload(
          await screen.findByLabelText('Take or choose a photo'),
          new File(['%PDF'], 'invite.pdf', { type: 'application/pdf' }),
        );
        await user.click(screen.getByRole('button', { name: 'Upload photo' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/not a photo/i);
        expect(game.uploadPhoto).not.toHaveBeenCalled();
      });

      it('shows each suit its own rules plus the road to the King', async () => {
        renderArea(await loggedIn(), '/area/suits/clubs');
        const rules = await screen.findByRole('region', { name: 'Rules' });
        expect(rules).toHaveTextContent(/keep your eyes open/i);
        expect(rules).toHaveTextContent(/QR code/);
        expect(rules).toHaveTextContent(/spell the name of the Jack/i);
        expect(rules).toHaveTextContent(/discover the name of the Queen/i);
        expect(rules).not.toHaveTextContent(/📷|photo/i);
      });

      it('has no photo challenge on the other suits', async () => {
        renderArea(await loggedIn(), '/area/suits/clubs');
        await screen.findByRole('list', { name: 'Clubs cards' });
        expect(screen.queryByRole('button', { name: /photo/i })).not.toBeInTheDocument();
      });
    });

    describe('diamonds quiz', () => {
      it('shows the rules and the three lives', async () => {
        renderArea(await loggedIn(), '/area/suits/diamonds');
        const rules = await screen.findByRole('region', { name: 'Rules' });
        expect(rules).toHaveTextContent(/newlyweds/i);
        expect(rules).toHaveTextContent(/ask the other guests/i);
        expect(rules).toHaveTextContent(/carry them out before claiming the prize/i);
        expect(rules).toHaveTextContent(/Jack, Queen and King the question and its answers are told to you in person/i);
        expect(await screen.findByText('3 of 3 lives left')).toBeInTheDocument();
      });

      it('costs a life and brings a new question on a wrong answer, collects the card on the right one', async () => {
        const game = createFakeGame();
        renderArea(await loggedIn(), '/area/suits/diamonds', game);
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Quiz for the 5 of diamonds' }));
        const dialog = await screen.findByRole('dialog', { name: 'Quiz · 5 of diamonds' });
        expect(within(dialog).getByRole('group', { name: 'Question q1 about the couple?' })).toBeInTheDocument();
        const submit = within(dialog).getByRole('button', { name: 'Submit' });
        expect(submit).toBeDisabled();

        await user.click(within(dialog).getByRole('radio', { name: 'Wrong answer of q1' }));
        await user.click(submit);
        expect(game.answerQuiz).toHaveBeenCalledWith('diamonds5', 'q1', 'q1-wrong');
        expect(await within(dialog).findByRole('alert')).toHaveTextContent('you lost a life (2 left)');
        expect(within(dialog).getByRole('group', { name: 'Question q2 about the couple?' })).toBeInTheDocument();
        expect(screen.getByText('2 of 3 lives left')).toBeInTheDocument();

        await user.click(within(dialog).getByRole('radio', { name: 'Right answer of q2' }));
        await user.click(within(dialog).getByRole('button', { name: 'Submit' }));
        expect(await within(dialog).findByText('Right answer! 🎉')).toBeInTheDocument();
        expect(within(dialog).getByText('D')).toBeInTheDocument();
        await waitFor(() => expect(game.getSuitCards).toHaveBeenCalledTimes(2));
      });

      it('turns wrong answers into penalties once the lives are over', async () => {
        const game = createFakeGame({
          getQuizStatus: vi.fn(async () => ({ lives: 0, maxLives: 3, penalties: 1 })),
          answerQuiz: vi.fn(async () => ({
            correct: false as const,
            stale: false,
            question: quizQuestion('q3'),
            status: { lives: 0, maxLives: 3, penalties: 2 },
          })),
        });
        renderArea(await loggedIn(), '/area/suits/diamonds', game);
        const user = userEvent.setup();
        expect(await screen.findByText('0 of 3 lives left, 1 penalty')).toBeInTheDocument();

        await user.click(await screen.findByRole('button', { name: 'Quiz for the 2 of diamonds' }));
        await user.click(await screen.findByRole('radio', { name: 'Wrong answer of q1' }));
        await user.click(screen.getByRole('button', { name: 'Submit' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('you got a penalty (2 so far)');
        expect(screen.getByText('0 of 3 lives left, 2 penalties')).toBeInTheDocument();
      });

      it('asks the Jack, Queen and King questions in person: only the number and the letters are shown', async () => {
        const game = createFakeGame({
          getQuizQuestion: vi.fn(async () => ({
            solved: false as const,
            status: fullLives,
            question: {
              questionId: 'kq',
              inPerson: true,
              number: 2,
              text: '',
              answers: ['A', 'B', 'C', 'D'].map((letter) => ({ id: `kq-${letter}`, text: letter })),
            },
          })),
        });
        renderArea(await loggedIn(), '/area/suits/diamonds', game);
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Quiz for the Jack of diamonds' }));
        const dialog = await screen.findByRole('dialog', { name: 'Quiz · Jack of diamonds' });
        expect(within(dialog).getByRole('group', { name: 'Question n° 2' })).toBeInTheDocument();
        expect(within(dialog).getByText(/will ask you this question/)).toHaveTextContent('in person');
        expect(within(dialog).getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual([
          'A',
          'B',
          'C',
          'D',
        ]);

        await user.click(within(dialog).getByRole('radio', { name: 'C' }));
        await user.click(within(dialog).getByRole('button', { name: 'Submit' }));
        expect(game.answerQuiz).toHaveBeenCalledWith('diamonds11', 'kq', 'kq-C');
      });

      it('shows a won card as won', async () => {
        const game = createFakeGame({
          getQuizQuestion: vi.fn(async () => ({ solved: true as const, letter: 'N', status: fullLives })),
        });
        renderArea(await loggedIn(), '/area/suits/diamonds', game);
        await userEvent.setup().click(await screen.findByRole('button', { name: 'Quiz won for the 6 of diamonds' }));
        expect(await screen.findByText('Right answer! 🎉')).toBeInTheDocument();
      });
    });

    describe('gallery', () => {
      const photo = (n: number, updated: string): GalleryPhoto => ({
        id: `p${n}`,
        suit: 'hearts',
        rank: n,
        scene: `Scene ${n}`,
        player: `Guest${n}`,
        thumbUrl: `http://pb/${n}-480.jpg`,
        largeUrl: `http://pb/${n}-1200.jpg`,
        updated,
      });

      it('shows the photos, loads more on demand and enlarges one on click', async () => {
        const getGallery = vi
          .fn<GameRepository['getGallery']>()
          .mockResolvedValueOnce({ items: [photo(3, '2026-10-15 10:03'), photo(2, '2026-10-15 10:02')], hasMore: true })
          .mockResolvedValueOnce({ items: [photo(2, '2026-10-15 10:02'), photo(1, '2026-10-15 10:01')], hasMore: false });
        renderArea(await loggedIn(), '/area/gallery', createFakeGame({ getGallery }));
        const user = userEvent.setup();

        const list = await screen.findByRole('list', { name: 'Photos' });
        expect(within(list).getAllByRole('button')).toHaveLength(2);
        await user.click(screen.getByRole('button', { name: 'Load more photos' }));
        // Page 2 overlaps page 1 (new uploads shift pages): no duplicates.
        await waitFor(() => expect(within(list).getAllByRole('button')).toHaveLength(3));
        expect(getGallery).toHaveBeenLastCalledWith(2, 24);
        expect(screen.queryByRole('button', { name: 'Load more photos' })).not.toBeInTheDocument();

        await user.click(within(list).getByRole('button', { name: 'Scene 3, by Guest3 (3 of hearts)' }));
        const dialog = await screen.findByRole('dialog', { name: 'Scene 3' });
        // Protected files: the URL carries the file token.
        expect(within(dialog).getByRole('img', { name: 'Scene 3' })).toHaveAttribute('src', 'http://pb/3-1200.jpg?token=file-token');
      });

      it('adds new and replaced photos at the top every few seconds', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
          const getGalleryUpdates = vi
            .fn<GameRepository['getGalleryUpdates']>()
            .mockResolvedValue([photo(4, '2026-10-15 10:04'), photo(1, '2026-10-15 10:05')]);
          const game = createFakeGame({
            getGallery: vi.fn(async () => ({ items: [photo(2, '2026-10-15 10:02'), photo(1, '2026-10-15 10:01')], hasMore: false })),
            getGalleryUpdates,
          });
          renderArea(await loggedIn(), '/area/gallery', game);
          const list = await screen.findByRole('list', { name: 'Photos' });

          await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000);
          });
          expect(getGalleryUpdates).toHaveBeenCalledWith('2026-10-15 10:02');
          const names = within(list).getAllByRole('button').map((b) => b.getAttribute('aria-label')?.split(',')[0]);
          expect(names).toEqual(['Scene 4', 'Scene 1', 'Scene 2']);
          expect(screen.getByText('1 new photo')).toBeInTheDocument();
        } finally {
          vi.useRealTimers();
        }
      });

      it('invites to take the first photo when the gallery is empty', async () => {
        renderArea(await loggedIn(), '/area/gallery');
        expect(await screen.findByText(/no photos yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('sign-up secret code', () => {
    async function fillSignup(code: string) {
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText(/full name/i), 'Anna Verdi');
      await user.type(screen.getByLabelText(/^e-mail$/i), 'anna@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i, { selector: 'input' }), 'password123');
      if (code) await user.type(screen.getByLabelText(/secret code/i), code);
      await user.click(screen.getByRole('button', { name: /create account/i }));
    }

    it('requires the secret code before calling the server', async () => {
      const auth = createFakeAuth();
      renderArea(auth, '/area/signup');
      await fillSignup('');
      expect(await screen.findByText('Please enter the secret code.')).toBeInTheDocument();
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    it('sends the code and shows the server verdict on the field', async () => {
      const auth = createFakeAuth({
        signUp: vi.fn().mockRejectedValue(
          new AuthError('validation', 'Please check the highlighted fields.', { secretCode: 'This secret code is not correct.' }),
        ),
      });
      renderArea(auth, '/area/signup');
      await fillSignup(' #party ');
      expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ secretCode: '#party' }));
      expect(await screen.findByText('This secret code is not correct.')).toBeInTheDocument();
      expect(screen.getByLabelText(/secret code/i)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('organisers', () => {
    async function loggedInAdmin() {
      const auth = createFakeAuth();
      await auth.login('admin@example.com', 'x');
      return auth;
    }

    it('shows organisers their own home with the four suits and the secret code', async () => {
      const admin = createFakeAdmin();
      renderArea(await loggedInAdmin(), '/area', createFakeGame(), admin);

      expect(await screen.findByText('Organisers')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Clubs: Letters & riddles' })).toHaveAttribute('href', '/area/admin/suits/clubs');
      expect(screen.getByRole('link', { name: 'Hearts: Letters & scenes' })).toHaveAttribute('href', '/area/admin/suits/hearts');

      const code = await screen.findByLabelText(/code guests need/i);
      await waitFor(() => expect(code).toHaveValue('#wedding'));
      const user = userEvent.setup();
      await user.clear(code);
      await user.type(code, '#Sposi2027');
      await user.click(screen.getByRole('button', { name: 'Save code' }));
      expect(admin.updateSettings).toHaveBeenCalledWith({ signupCode: '#Sposi2027' });
      expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
    });

    it('keeps guests out of the admin pages', async () => {
      const router = renderArea(await (async () => {
        const auth = createFakeAuth();
        await auth.login('anna@example.com', 'x');
        return auth;
      })(), '/area/admin/suits/clubs');
      expect(await screen.findByRole('heading', { name: /hello, anna/i })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/area');
    });

    it('edits the letter, riddle and solution of a club, sending only the changes', async () => {
      const admin = createFakeAdmin();
      renderArea(await loggedInAdmin(), '/area/admin/suits/clubs', createFakeGame(), admin);
      const user = userEvent.setup();

      const seven = await screen.findByRole('article', { name: '7 of clubs' });
      const save = within(seven).getByRole('button', { name: 'Save' });
      expect(save).toBeDisabled();

      await user.clear(within(seven).getByLabelText('Secret letter'));
      await user.type(within(seven).getByLabelText('Secret letter'), 'z');
      await user.clear(within(seven).getByLabelText('Solution'));
      await user.type(within(seven).getByLabelText('Solution'), 'big apple');
      await user.click(save);

      expect(admin.updateCard).toHaveBeenCalledWith('c7', { letter: 'Z', solution: 'big apple' });
      expect(await within(seven).findByText('Saved ✓')).toBeInTheDocument();
      expect(within(seven).getByLabelText('Solution')).toHaveValue('BIGAPPLE');

      // Face cards: riddle and solution, but no letter.
      const king = screen.getByRole('article', { name: 'King of clubs' });
      expect(within(king).queryByLabelText('Secret letter')).not.toBeInTheDocument();
      expect(within(king).getByLabelText('Riddle')).toHaveValue('Riddle 13');
    });

    it('shows the server errors next to the field', async () => {
      const admin = createFakeAdmin({
        updateCard: vi.fn().mockRejectedValue(
          new AdminError('validation', 'Please check the highlighted values.', { solution: 'Invalid value format.' }),
        ),
      });
      renderArea(await loggedInAdmin(), '/area/admin/suits/clubs', createFakeGame(), admin);
      const user = userEvent.setup();
      const two = await screen.findByRole('article', { name: '2 of clubs' });
      await user.type(within(two).getByLabelText('Solution'), 'pear');
      await user.click(within(two).getByRole('button', { name: 'Save' }));
      expect(await within(two).findByText('Invalid value format.')).toBeInTheDocument();
      expect(within(two).getByLabelText('Solution')).toHaveAttribute('aria-invalid', 'true');

      // Fixing the value clears the error.
      await user.type(within(two).getByLabelText('Solution'), 's');
      expect(within(two).queryByText('Invalid value format.')).not.toBeInTheDocument();
    });

    it('adds, edits and deletes the scenes of a heart', async () => {
      const admin = createFakeAdmin();
      renderArea(await loggedInAdmin(), '/area/admin/suits/hearts', createFakeGame(), admin);
      const user = userEvent.setup();

      const three = await screen.findByRole('article', { name: '3 of hearts' });
      const scene = within(three).getByLabelText('Scene 1 of the 3 of hearts');
      await user.clear(scene);
      await user.type(scene, 'A juggler');
      await user.click(within(three).getByRole('button', { name: 'Save scene 1 of the 3 of hearts' }));
      expect(admin.updateScene).toHaveBeenCalledWith('s3', 'A juggler');

      await user.type(within(three).getByLabelText('New scene for the 3 of hearts'), 'Three hats on one head');
      await user.click(within(three).getByRole('button', { name: 'Add scene' }));
      expect(admin.addScene).toHaveBeenCalledWith('h3', 'Three hats on one head');
      expect(await within(three).findByText('(2)')).toBeInTheDocument();

      await user.click(within(three).getByRole('button', { name: 'Delete scene 1 of the 3 of hearts' }));
      await user.click(within(three).getByRole('button', { name: 'Confirm delete' }));
      expect(admin.deleteScene).toHaveBeenCalledWith('s3');
      expect(await within(three).findByText('(1)')).toBeInTheDocument();

      // Face hearts: the scene is told in person.
      expect(within(screen.getByRole('article', { name: 'Queen of hearts' })).getByText(/told in person/i)).toBeInTheDocument();
    });

    it('adds, edits and fixes the correct answer of diamonds quiz questions', async () => {
      const admin = createFakeAdmin();
      renderArea(await loggedInAdmin(), '/area/admin/suits/diamonds', createFakeGame(), admin);
      const user = userEvent.setup();

      const five = await screen.findByRole('article', { name: '5 of diamonds' });
      expect(within(five).getByLabelText('Text of question 1 of the 5 of diamonds')).toHaveValue('Where did they meet? (5)');

      // The correct answer cannot be deleted; moving the mark is one click.
      expect(within(five).getByRole('button', { name: 'Delete answer 1 of question 1 of the 5 of diamonds' })).toBeDisabled();
      await user.click(within(five).getByRole('radio', { name: 'Answer 2 is the correct one' }));
      expect(admin.updateAnswer).toHaveBeenCalledWith('dq5-b', { correct: true });
      await waitFor(() => expect(within(five).getByRole('radio', { name: 'Answer 2 is the correct one' })).toBeChecked());

      await user.type(within(five).getByLabelText('New answer for question 1 of the 5 of diamonds'), 'In Rome');
      await user.click(within(five).getByRole('button', { name: 'Add answer' }));
      expect(admin.addAnswer).toHaveBeenCalledWith('dq5', { text: 'In Rome' });

      // New question: text, answers, correct one.
      const addQuestion = within(five).getByRole('button', { name: 'Add question' });
      expect(addQuestion).toBeDisabled();
      await user.type(within(five).getByLabelText('New question text for the 5 of diamonds'), 'Favourite colour?');
      await user.type(within(five).getByLabelText('New answer 1 for the 5 of diamonds'), 'Blue');
      await user.type(within(five).getByLabelText('New answer 2 for the 5 of diamonds'), 'Green');
      await user.click(within(five).getByRole('radio', { name: 'New answer 2 is the correct one' }));
      await user.click(addQuestion);
      expect(admin.addQuestion).toHaveBeenCalledWith('d5', {
        text: 'Favourite colour?',
        answers: [
          { text: 'Blue', correct: false },
          { text: 'Green', correct: true },
        ],
      });
      expect(await within(five).findByText('(2)')).toBeInTheDocument();
    });

    it('numbers the in-person questions of the face diamonds and letters their answers', async () => {
      renderArea(await loggedInAdmin(), '/area/admin/suits/diamonds');
      const queen = await screen.findByRole('article', { name: 'Queen of diamonds' });
      expect(within(queen).getByRole('group', { name: 'Question n° 1' })).toBeInTheDocument();
      expect(within(queen).getByText(/asked in person/i)).toBeInTheDocument();
      const answers = within(within(queen).getByRole('group', { name: 'Question n° 1' })).getAllByRole('listitem');
      expect(answers.map((item) => item.textContent?.trim()[0])).toEqual(['A', 'B']);

      // Numbered cards are read by the guests themselves: no numbering.
      const five = screen.getByRole('article', { name: '5 of diamonds' });
      expect(within(five).queryByText(/Question n°/)).not.toBeInTheDocument();
    });
  });
});
