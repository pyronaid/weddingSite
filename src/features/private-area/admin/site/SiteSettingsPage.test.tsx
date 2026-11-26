import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { defaultContent } from '../../../../config/wedding';
import { fileLabel } from '../../../../brand/svgFiles';
import { PATTERNS } from '../../../../prints/art';
import { DEFAULT_PALETTE, PALETTE_PRESETS, type Palette } from '../../../../theme/palette';
import {
  AdminError,
  type AdminRepository,
  type AdminRsvp,
  type AdminRsvpsPage,
  type AdminUser,
  type AdminUsersPage,
  type PrintDesignKind,
  type RsvpFilter,
} from '../../../../services/admin';
import type { Rank, Suit } from '../../../../services/game';
import type { AuthService, AuthUser } from '../../../../services/auth';
import type { SiteContent, SiteRepository, SiteSettings } from '../../../../services/site';
import { SiteContentContext } from '../../../../site/SiteContentContext';
import { AuthProvider } from '../../AuthProvider';
import { AdminRepositoryProvider } from '../AdminRepositoryContext';
import { SiteSettingsPage } from './SiteSettingsPage';
import { SEARCH_DEBOUNCE_MS } from './UsersEditor';

const superAdmin: AuthUser = {
  id: 's1',
  email: 'super@example.com',
  name: 'Sara',
  verified: true,
  adminSuits: [],
  isSuperAdmin: true,
};

const auth: AuthService = {
  getCurrentUser: () => superAdmin,
  subscribe: () => () => {},
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(async () => {}),
  signUp: vi.fn(),
  requestVerification: vi.fn(),
  confirmVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
};

/** Saves like the server: settings in, normalised content out. */
function fakeRepository(): SiteRepository & { content: SiteContent } {
  const repository = {
    content: defaultContent,
    load: vi.fn(async () => repository.content),
    save: vi.fn(async (settings: SiteSettings) => {
      repository.content = {
        ...repository.content,
        ...settings,
        gift: {
          ...settings.gift,
          iban: settings.gift.iban.replace(/\s+/g, '').toUpperCase(),
        },
      };
      return repository.content;
    }),
    uploadPhoto: vi.fn(async (slot: string, _image: Blob, alt: string) => {
      repository.content = {
        ...repository.content,
        photos: {
          ...repository.content.photos,
          [slot]: { src: 'http://pb/new.jpg', alt },
        },
        uploaded: [...repository.content.uploaded, slot as never],
      };
      return repository.content;
    }),
    updatePhotoAlt: vi.fn(async () => repository.content),
    resetPhoto: vi.fn(async () => {
      repository.content = {
        ...repository.content,
        photos: defaultContent.photos,
        uploaded: [],
      };
      return repository.content;
    }),
    savePalette: vi.fn(async (palette: Palette) => {
      repository.content = { ...repository.content, palette };
      return repository.content;
    }),
  };
  return repository;
}

/** 45 guests, as the server pages them: filtered by name or e-mail, 20 at a time. */
const guests: AdminUser[] = Array.from({ length: 45 }, (_, i) => ({
  id: `u${i + 1}`,
  name: `Guest ${String(i + 1).padStart(2, '0')}`,
  email: `guest${i + 1}@example.com`,
  verified: i !== 1,
  adminSuits: i === 0 ? (['clubs'] as Suit[]) : [],
  isSuperAdmin: i === 2,
}));

function listGuests(query: string, page: number): AdminUsersPage {
  const q = query.toLowerCase();
  const all = guests.filter((g) => g.name.toLowerCase().includes(q) || g.email.includes(q));
  const totalPages = Math.max(1, Math.ceil(all.length / 20));
  const current = Math.min(page, totalPages);
  return {
    items: all.slice((current - 1) * 20, current * 20),
    page: current,
    perPage: 20,
    totalItems: all.length,
    totalPages,
  };
}

/**
 * 25 replies, newest first. Anna replied twice: her first reply ("2 people")
 * is replaced by the second ("3 people") and only that one counts.
 */
const replies: AdminRsvp[] = [
  {
    id: 'r0',
    fullName: 'Anna Verdi',
    email: 'anna@example.com',
    attending: true,
    guests: 3,
    dietaryNotes: 'Vegetarian, one child',
    message: 'Can’t wait!',
    created: '2027-04-02T09:30:00.000Z',
    replaced: false,
  },
  {
    id: 'r1',
    fullName: 'Luca Neri',
    email: 'luca@example.com',
    attending: false,
    guests: 0,
    dietaryNotes: '',
    message: 'Sorry, we are abroad.',
    created: '2027-04-01T18:00:00.000Z',
    replaced: false,
  },
  {
    id: 'r2',
    fullName: 'Anna Verdi',
    email: 'anna@example.com',
    attending: true,
    guests: 2,
    dietaryNotes: 'Vegetarian',
    message: '',
    created: '2027-03-30T10:00:00.000Z',
    replaced: true,
  },
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `r${i + 3}`,
    fullName: `Guest ${i + 1}`,
    email: `guest${i + 1}@example.com`,
    attending: true,
    guests: 1,
    dietaryNotes: '',
    message: '',
    created: `2027-03-${String(29 - i).padStart(2, '0')}T08:00:00.000Z`,
    replaced: false,
  })),
];

function listReplies(query: string, attending: RsvpFilter, page: number): AdminRsvpsPage {
  const q = query.toLowerCase();
  const all = replies.filter(
    (r) =>
      (r.fullName.toLowerCase().includes(q) || r.email.includes(q)) &&
      (attending === 'all' || r.attending === (attending === 'yes')),
  );
  const totalPages = Math.max(1, Math.ceil(all.length / 20));
  const current = Math.min(page, totalPages);
  return {
    items: all.slice((current - 1) * 20, current * 20),
    page: current,
    perPage: 20,
    totalItems: all.length,
    totalPages,
    summary: { replies: 24, attending: 23, declined: 1, guests: 25 },
  };
}

/** The Prints designs saved "on the server", shared by the renders that use the same store. */
type DesignStore = Partial<Record<PrintDesignKind, object>>;

function fakeAdmin(overrides: Partial<AdminRepository> = {}, designs: DesignStore = {}): AdminRepository {
  const fail = vi.fn().mockRejectedValue(new Error('not used here'));
  return {
    getSuit: fail,
    updateCard: fail,
    addScene: fail,
    updateScene: fail,
    deleteScene: fail,
    addQuestion: fail,
    updateQuestion: fail,
    deleteQuestion: fail,
    addAnswer: fail,
    updateAnswer: fail,
    deleteAnswer: fail,
    getPeople: fail,
    addPerson: fail,
    updatePerson: fail,
    deletePerson: fail,
    getSettings: vi.fn(async () => ({ signupCode: '#wedding', superAdminSignupCode: '' })),
    updateSettings: vi.fn(async (changes) => ({ signupCode: '#wedding', superAdminSignupCode: '', ...changes })),
    listUsers: vi.fn(async (query: string, page: number) => listGuests(query, page)),
    getRiddleCodes: vi.fn(async () =>
      Array.from({ length: 13 }, (_, i) => ({
        id: `c${i + 1}`,
        rank: (i + 1) as Rank,
        code: `code${i + 1}`,
        ready: i !== 4,
      })),
    ),
    getPrintDesign: vi.fn(async (kind: PrintDesignKind) => ({ design: designs[kind] ?? null, updated: null })),
    savePrintDesign: vi.fn(async (kind: PrintDesignKind, design: object) => {
      designs[kind] = design;
      return { design, updated: '2026-11-14T10:00:00Z' };
    }),
    listRsvps: vi.fn(async (query: string, attending: RsvpFilter, page: number) => listReplies(query, attending, page)),
    setUserSuits: vi.fn(async (userId: string, suits: Suit[]) => ({
      ...guests.find((g) => g.id === userId)!,
      adminSuits: suits,
    })),
    ...overrides,
  };
}

function renderPage(repository: SiteRepository, replace = vi.fn(), path = '/area/site', admin = fakeAdmin()) {
  const router = createMemoryRouter(
    [
      {
        path: '/area/site/:tab?/:sub?',
        element: (
          <AuthProvider service={auth}>
            <SiteContentContext.Provider value={{ content: defaultContent, repository, replace }}>
              <AdminRepositoryProvider value={admin}>
                <SiteSettingsPage />
              </AdminRepositoryProvider>
            </SiteContentContext.Provider>
          </AuthProvider>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return { replace, router, admin };
}

beforeEach(() => {
  // jsdom has no object URLs nor image decoding: preparePhoto sends the file as is.
  globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error('no decoder'));
});

describe('site settings (super admin)', () => {
  it('edits names, date, venues and gift, and saves them for the whole site', async () => {
    const repository = fakeRepository();
    const { replace } = renderPage(repository);
    const user = userEvent.setup();

    const one = await screen.findByLabelText('First name of the bride (or groom)');
    expect(one).toHaveValue('Giulia');
    expect(screen.getByLabelText('Wedding date and time')).toHaveValue('2027-06-19T16:00');
    const save = screen.getByRole('button', { name: 'Save the settings' });
    expect(save).toBeDisabled();

    await user.clear(one);
    await user.type(one, 'Sofia');
    await user.clear(screen.getByLabelText('Wedding date and time'));
    await user.type(screen.getByLabelText('Wedding date and time'), '2028-01-15T11:00');
    // No reception any more.
    await user.click(screen.getByRole('checkbox', { name: 'There is a reception' }));
    const iban = screen.getByLabelText('IBAN');
    await user.clear(iban);
    await user.type(iban, 'de89 3704 0044 0532 0130 00');
    await user.click(screen.getByRole('radio', { name: 'Italiano' }));
    await user.click(save);

    await waitFor(() => expect(repository.save).toHaveBeenCalled());
    const settings = vi.mocked(repository.save).mock.calls[0][0];
    expect(settings).toMatchObject({
      language: 'it',
      couple: { partnerOne: 'Sofia', partnerTwo: 'Marco' },
      // Winter in Rome: +01:00.
      date: '2028-01-15T11:00:00+01:00',
      timezone: 'Europe/Rome',
      reception: null,
      gift: { iban: 'de89 3704 0044 0532 0130 00' },
    });
    // The whole site is updated at once, with the IBAN as normalised by the server.
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ language: 'it' }));
    expect(await screen.findByLabelText('IBAN')).toHaveValue('DE89370400440532013000');
    expect(screen.getByText('Saved ✓')).toBeInTheDocument();
  });

  it('checks the IBAN, the time zone and the required fields before saving', async () => {
    const repository = fakeRepository();
    renderPage(repository);
    const user = userEvent.setup();

    const iban = await screen.findByLabelText('IBAN');
    await user.clear(iban);
    await user.type(iban, 'IT60X0542811101000000123457');
    const zone = screen.getByLabelText('Time zone of the wedding');
    await user.clear(zone);
    await user.type(zone, 'Europe/Atlantis');
    await user.clear(screen.getByLabelText('Account holder'));
    await user.click(screen.getByRole('button', { name: 'Save the settings' }));

    expect(screen.getByText('This IBAN is not valid: check it again.')).toBeInTheDocument();
    expect(screen.getByText('Unknown time zone: pick one from the list.')).toBeInTheDocument();
    expect(screen.getByText('Please fill in this field.')).toBeInTheDocument();
    // The first wrong field gets the focus.
    expect(screen.getByLabelText('Time zone of the wedding')).toHaveFocus();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('shows the errors of the server next to their field', async () => {
    const repository = fakeRepository();
    repository.save = vi.fn().mockRejectedValue(
      new AdminError('validation', 'Please check the highlighted values.', {
        bic: 'A BIC has 8 or 11 letters and digits.',
      }),
    );
    renderPage(repository);
    const user = userEvent.setup();

    const bic = await screen.findByLabelText('BIC / SWIFT (optional)');
    await user.clear(bic);
    await user.type(bic, 'XX');
    await user.click(screen.getByRole('button', { name: 'Save the settings' }));

    expect(await screen.findByText('A BIC has 8 or 11 letters and digits.')).toBeInTheDocument();
    expect(bic).toHaveAttribute('aria-invalid', 'true');
  });

  it('replaces a photo, then brings back the default picture', async () => {
    const repository = fakeRepository();
    const { replace } = renderPage(repository, vi.fn(), '/area/site/photos');
    const user = userEvent.setup();

    const hero = await screen.findByRole('article', {
      name: 'Main photo (top of the page)',
    });
    expect(within(hero).getByText(/Default picture/)).toBeInTheDocument();
    await user.upload(
      within(hero).getByLabelText('Change photo: Main photo (top of the page)'),
      new File(['jpeg'], 'us.jpg', { type: 'image/jpeg' }),
    );

    await waitFor(() => expect(repository.uploadPhoto).toHaveBeenCalledWith('hero', expect.any(File), ''));
    expect(await within(hero).findByText(/Your photo/)).toBeInTheDocument();
    expect(within(hero).getByRole('img')).toHaveAttribute('src', 'http://pb/new.jpg');
    expect(replace).toHaveBeenCalled();
    // A new photo gets its own description.
    expect(within(hero).getByLabelText('Description (for screen readers)')).toHaveValue('');

    await user.click(within(hero).getByRole('button', { name: 'Use the default' }));
    await user.click(within(hero).getByRole('button', { name: 'Confirm: use the default' }));
    expect(repository.resetPhoto).toHaveBeenCalledWith('hero');
    expect(await within(hero).findByText(/Default picture/)).toBeInTheDocument();
  });

  it('labels the section and private area photos by where they appear', async () => {
    renderPage(fakeRepository(), vi.fn(), '/area/site/photos');
    expect(
      await screen.findByRole('article', {
        name: 'Around “Location” · Left 1',
      }),
    ).toBeInTheDocument();
    const floating = screen.getByRole('article', {
      name: 'Floating in the private area · Photo 8',
    });
    expect(within(floating).getByText('Decorative: no description needed.')).toBeInTheDocument();
  });

  describe('tabs', () => {
    it('opens the general data first, with one tab per section', async () => {
      renderPage(fakeRepository());
      const tabs = screen.getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual([
        'General',
        'Photos',
        'Colour palette',
        'Organisers',
        'RSVPs',
        'Sign-up code',
        'Prints',
      ]);
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByLabelText('IBAN')).toBeInTheDocument();
      expect(screen.queryByRole('article', { name: 'Main photo (top of the page)' })).not.toBeInTheDocument();
    });

    it('gives every tab its own address, and an unknown one shows the general data', async () => {
      const { router } = renderPage(fakeRepository(), vi.fn(), '/area/site/nonsense');
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');

      await userEvent.setup().click(screen.getByRole('tab', { name: 'Photos' }));
      expect(router.state.location.pathname).toBe('/area/site/photos');
      expect(screen.getByRole('tab', { name: 'Photos' })).toHaveAttribute('aria-selected', 'true');
      expect(
        await screen.findByRole('article', {
          name: 'Main photo (top of the page)',
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole('tabpanel')).toHaveAttribute(
        'aria-labelledby',
        screen.getByRole('tab', { name: 'Photos' }).id,
      );
    });

    it('moves between tabs with the arrow keys, Home and End', async () => {
      const { router } = renderPage(fakeRepository());
      const user = userEvent.setup();
      screen.getByRole('tab', { name: 'General' }).focus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'Photos' })).toHaveFocus();
      expect(router.state.location.pathname).toBe('/area/site/photos');
      await user.keyboard('{End}');
      expect(screen.getByRole('tab', { name: 'Prints' })).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'General' })).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(router.state.location.pathname).toBe('/area/site/prints');
      // Only the selected tab is in the Tab order.
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('colour palette', () => {
    const preview = () => screen.getByTestId('palette-preview');

    it('tries colours in the preview only, then saves them for the whole site', async () => {
      const repository = fakeRepository();
      const { replace } = renderPage(repository, vi.fn(), '/area/site/colours');
      const user = userEvent.setup();

      const cardBackground = await screen.findByLabelText('Card background');
      expect(cardBackground).toHaveValue(DEFAULT_PALETTE.cardBg);
      const save = screen.getByRole('button', { name: 'Save the colours' });
      expect(save).toBeDisabled();
      expect(screen.getByText('All the texts are easy to read.')).toBeInTheDocument();

      // The picker, and the code typed by hand (with or without "#").
      fireEvent.change(cardBackground, { target: { value: '#2F3E5C' } });
      const code = screen.getByLabelText('Card highlights: colour code');
      await user.clear(code);
      await user.type(code, 'b9d4f2');
      expect(code).toHaveValue('b9d4f2');
      expect(preview().style.getPropertyValue('--card-bg')).toBe('#2f3e5c');
      expect(preview().style.getPropertyValue('--card-accent')).toBe('#b9d4f2');
      expect(screen.getByText('Not saved yet: only the preview shows these colours.')).toBeInTheDocument();
      // Nothing changes on the site until it is saved.
      expect(repository.savePalette).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();

      await user.click(save);
      expect(repository.savePalette).toHaveBeenCalledWith({
        ...DEFAULT_PALETTE,
        cardBg: '#2f3e5c',
        cardAccent: '#b9d4f2',
      });
      expect(await screen.findByText('Saved: the whole site uses these colours ✓')).toBeInTheDocument();
      expect(replace).toHaveBeenCalledWith(
        expect.objectContaining({ palette: expect.objectContaining({ cardBg: '#2f3e5c' }) }),
      );
      expect(save).toBeDisabled();
    });

    it('starts from a ready-made palette, undoes the changes, or goes back to the original colours', async () => {
      const repository = fakeRepository();
      repository.content = { ...repository.content, palette: PALETTE_PRESETS.sage };
      renderPage(repository, vi.fn(), '/area/site/colours');
      const user = userEvent.setup();

      expect(await screen.findByRole('button', { name: 'Sage' })).toHaveAttribute('aria-pressed', 'true');
      await user.click(screen.getByRole('button', { name: 'Navy' }));
      expect(screen.getByRole('button', { name: 'Navy' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Text on the page')).toHaveValue(PALETTE_PRESETS.navy.text);

      await user.click(screen.getByRole('button', { name: 'Undo the changes' }));
      expect(screen.getByLabelText('Text on the page')).toHaveValue(PALETTE_PRESETS.sage.text);
      expect(screen.queryByRole('button', { name: 'Undo the changes' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Back to the original colours' }));
      expect(screen.getByRole('button', { name: 'Pink (original)' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Card background')).toHaveValue(DEFAULT_PALETTE.cardBg);
    });

    it('warns when a text would be hard to read, and ignores a code that is not a colour', async () => {
      const repository = fakeRepository();
      renderPage(repository, vi.fn(), '/area/site/colours');
      const user = userEvent.setup();

      const code = await screen.findByLabelText('Card text: colour code');
      await user.clear(code);
      await user.type(code, '#7a45');
      // Not a whole colour yet: shown as typed, marked, nothing else changes.
      expect(code).toHaveAttribute('aria-invalid', 'true');
      expect(preview().style.getPropertyValue('--card-text')).toBe(DEFAULT_PALETTE.cardText);
      await user.type(code, '60');
      expect(preview().style.getPropertyValue('--card-text')).toBe('#7a4560');
      expect(screen.getByText('Hard to read')).toBeInTheDocument();
      expect(
        screen.getByText(/Card text on the card background: contrast 1\.2:1, at least 4\.5:1 is recommended\./),
      ).toBeInTheDocument();
      // A warning, not a block: it can still be saved.
      expect(screen.getByRole('button', { name: 'Save the colours' })).toBeEnabled();
    });

    it('shows why a save failed', async () => {
      const repository = fakeRepository();
      repository.savePalette = vi.fn().mockRejectedValue(new AdminError('network', 'No connection: try again.'));
      renderPage(repository, vi.fn(), '/area/site/colours');
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'Sage' }));
      await user.click(screen.getByRole('button', { name: 'Save the colours' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('No connection: try again.');
      expect(screen.getByRole('button', { name: 'Save the colours' })).toBeEnabled();
    });
  });

  it('changes the sign-up secret code in its own tab', async () => {
    const admin = fakeAdmin();
    renderPage(fakeRepository(), vi.fn(), '/area/site/signup-code', admin);
    const user = userEvent.setup();

    const code = await screen.findByLabelText(/code guests need/i);
    await waitFor(() => expect(code).toHaveValue('#wedding'));
    await user.clear(code);
    await user.type(code, '#Sposi2027');
    await user.click(screen.getByRole('button', { name: 'Save code' }));
    expect(admin.updateSettings).toHaveBeenCalledWith({
      signupCode: '#Sposi2027',
    });
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
  });

  describe('super-admin sign-up code', () => {
    it('is closed until a code is set, with a warning, and is saved on its own', async () => {
      const admin = fakeAdmin();
      renderPage(fakeRepository(), vi.fn(), '/area/site/signup-code', admin);
      const user = userEvent.setup();

      const code = await screen.findByLabelText('Code that makes the new account a super admin');
      await waitFor(() => expect(code).toBeEnabled());
      expect(code).toHaveValue('');
      expect(screen.getByText('Closed: nobody can sign up as a super admin.')).toBeInTheDocument();
      expect(screen.getByText(/can change everything, as you can/)).toBeInTheDocument();
      const save = screen.getByRole('button', { name: 'Save super-admin code' });
      expect(save).toBeDisabled();

      await user.type(code, 'Sposi-Admin-2027');
      expect(screen.queryByText('Closed: nobody can sign up as a super admin.')).not.toBeInTheDocument();
      await user.click(save);
      // Only this code: the guests' one is left as it is.
      expect(admin.updateSettings).toHaveBeenCalledWith({ superAdminSignupCode: 'Sposi-Admin-2027' });
      expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
      expect(save).toBeDisabled();

      // Emptied again: closed (empty is allowed here, not for the guests' code).
      await user.clear(code);
      expect(save).toBeEnabled();
      await user.clear(screen.getByLabelText(/code guests need/i));
      expect(screen.getByRole('button', { name: 'Save code' })).toBeDisabled();
    });

    it('shows the reason the server refuses a code, on its field', async () => {
      const admin = fakeAdmin({
        updateSettings: vi.fn().mockRejectedValue(
          new AdminError('validation', 'Please check the highlighted fields.', {
            superAdminSignupCode: 'The guests’ code and the super-admin code must be different.',
          }),
        ),
      });
      renderPage(fakeRepository(), vi.fn(), '/area/site/signup-code', admin);
      const user = userEvent.setup();
      const code = await screen.findByLabelText('Code that makes the new account a super admin');
      await waitFor(() => expect(code).toBeEnabled());
      await user.type(code, '#wedding-long');
      await user.click(screen.getByRole('button', { name: 'Save super-admin code' }));
      expect(
        await screen.findByText('The guests’ code and the super-admin code must be different.'),
      ).toBeInTheDocument();
      expect(code).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('organisers', () => {
    const openOrganisers = (admin = fakeAdmin()) => {
      renderPage(fakeRepository(), vi.fn(), '/area/site/organisers', admin);
      return admin;
    };

    it('lists the registered guests 20 at a time', async () => {
      const admin = openOrganisers();
      const user = userEvent.setup();

      expect(await screen.findByText('45 registered guests')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(20);
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '← Previous' })).toBeDisabled();
      expect(screen.getByText(/guest2@example\.com · e-mail not confirmed/)).toBeInTheDocument();
      // Super admins edit everything: nothing to tick.
      const third = screen.getByText('Guest 03').closest('li')!;
      expect(within(third).getByText('Super admin: every suit')).toBeInTheDocument();
      expect(within(third).queryByRole('checkbox')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Next →' }));
      expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('Guest 21')).toBeInTheDocument();
      expect(admin.listUsers).toHaveBeenLastCalledWith('', 2);
      await user.click(screen.getByRole('button', { name: 'Next →' }));
      expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(screen.getByRole('button', { name: 'Next →' })).toBeDisabled();
    });

    it('searches only once the typing stops, from the first page', async () => {
      vi.useFakeTimers();
      try {
        const admin = openOrganisers();
        await act(async () => {});
        expect(admin.listUsers).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
        await act(async () => {});
        expect(admin.listUsers).toHaveBeenLastCalledWith('', 2);

        const search = screen.getByLabelText('Search by name or e-mail');
        for (const text of ['g', 'gu', 'guest4']) {
          fireEvent.change(search, { target: { value: text } });
          await act(async () => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
        }
        // Back to page 1 at once, but no search for every keystroke.
        expect(admin.listUsers).not.toHaveBeenCalledWith('g', expect.anything());
        expect(admin.listUsers).not.toHaveBeenCalledWith('guest4', expect.anything());

        await act(async () => vi.advanceTimersByTime(50));
        expect(admin.listUsers).toHaveBeenLastCalledWith('guest4', 1);
        // guest4, guest40...guest45
        expect(screen.getByText('7 registered guests')).toBeInTheDocument();

        fireEvent.change(search, { target: { value: 'nobody' } });
        await act(async () => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
        expect(screen.getByText('Nobody matches “nobody”.')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows only the answer to the latest search', async () => {
      let resolveSlow: (page: AdminUsersPage) => void = () => {};
      const admin = fakeAdmin({
        listUsers: vi.fn((query: string, page: number) =>
          query === 'guest1'
            ? new Promise<AdminUsersPage>((resolve) => (resolveSlow = resolve))
            : Promise.resolve(listGuests(query, page)),
        ),
      });
      openOrganisers(admin);
      const user = userEvent.setup();
      await screen.findByText('45 registered guests');

      const search = screen.getByLabelText('Search by name or e-mail');
      await user.type(search, 'guest1');
      await waitFor(() => expect(admin.listUsers).toHaveBeenLastCalledWith('guest1', 1));
      await user.type(search, '0');
      expect(await screen.findByText('1 registered guest')).toBeInTheDocument();
      // The slow, older answer arrives last: it is ignored.
      await act(async () => resolveSlow(listGuests('guest1', 1)));
      expect(screen.getByText('1 registered guest')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('saves the suits of a guest at once', async () => {
      const admin = openOrganisers();
      const user = userEvent.setup();

      const clubs = await screen.findByRole('checkbox', {
        name: 'Guest 01 organises Clubs',
      });
      expect(clubs).toBeChecked();
      await user.click(screen.getByRole('checkbox', { name: 'Guest 01 organises Hearts' }));
      // Always in the same order, whatever the order of the clicks.
      expect(admin.setUserSuits).toHaveBeenCalledWith('u1', ['hearts', 'clubs']);
      await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Guest 01 organises Hearts' })).toBeChecked());

      await user.click(clubs);
      expect(admin.setUserSuits).toHaveBeenLastCalledWith('u1', ['hearts']);
      await waitFor(() => expect(clubs).not.toBeChecked());
    });

    it('puts the suits back when the server refuses', async () => {
      const admin = openOrganisers(
        fakeAdmin({
          setUserSuits: vi
            .fn()
            .mockRejectedValue(new AdminError('forbidden', 'Only the bride and groom (super admins) can do this.')),
        }),
      );
      const user = userEvent.setup();

      const spades = await screen.findByRole('checkbox', {
        name: 'Guest 04 organises Spades',
      });
      await user.click(spades);
      const row = spades.closest('li')!;
      expect(await within(row).findByRole('alert')).toHaveTextContent('Only the bride and groom');
      expect(spades).not.toBeChecked();
      expect(admin.setUserSuits).toHaveBeenCalledWith('u4', ['spades']);
    });

    it('offers to try again when the list cannot be loaded', async () => {
      const listUsers = vi
        .fn()
        .mockRejectedValueOnce(new AdminError('network', 'The server cannot be reached.'))
        .mockImplementation(async (query: string, page: number) => listGuests(query, page));
      openOrganisers(fakeAdmin({ listUsers }));

      expect(await screen.findByRole('alert')).toHaveTextContent('The server cannot be reached.');
      await userEvent.setup().click(screen.getByRole('button', { name: '↻' }));
      expect(await screen.findByText('45 registered guests')).toBeInTheDocument();
    });
  });

  describe('RSVPs', () => {
    const openRsvps = (admin = fakeAdmin()) => {
      renderPage(fakeRepository(), vi.fn(), '/area/site/rsvps', admin);
      return admin;
    };

    it('shows the headcount and the replies, newest first, 20 at a time', async () => {
      const admin = openRsvps();
      const user = userEvent.setup();

      const headcount = await screen.findByLabelText('Headcount');
      expect(within(headcount).getByText('25 people')).toBeInTheDocument();
      expect(within(headcount).getByText('23 replies')).toBeInTheDocument();
      expect(within(headcount).getByText('1 reply')).toBeInTheDocument();
      expect(screen.getByText('25 replies')).toBeInTheDocument();

      const rows = screen.getAllByRole('listitem');
      expect(rows).toHaveLength(20);
      expect(within(rows[0]).getByText('Anna Verdi')).toBeInTheDocument();
      expect(within(rows[0]).getByText('Coming · 3 people')).toBeInTheDocument();
      expect(within(rows[0]).getByText('Vegetarian, one child')).toBeInTheDocument();
      expect(within(rows[0]).getByText('Can’t wait!')).toBeInTheDocument();
      expect(within(rows[0]).getByRole('link', { name: 'anna@example.com' })).toHaveAttribute(
        'href',
        'mailto:anna@example.com',
      );
      // In the wedding's time zone (Rome, summer time: +2).
      expect(within(rows[0]).getByText(/Sent on 2 Apr 2027, 11:30/)).toBeInTheDocument();
      expect(within(rows[1]).getByText('Not coming')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Replaced by a newer reply: not counted')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Next →' }));
      expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(admin.listRsvps).toHaveBeenLastCalledWith('', 'all', 2);
    });

    it('filters by answer and by name, from the first page', async () => {
      const admin = openRsvps();
      const user = userEvent.setup();
      await screen.findByText('25 replies');
      await user.click(screen.getByRole('button', { name: 'Next →' }));
      await screen.findByText('Page 2 of 2');

      await user.selectOptions(screen.getByLabelText('Show'), 'Not coming');
      expect(await screen.findByText('1 reply', { selector: '[role=status]' })).toBeInTheDocument();
      expect(admin.listRsvps).toHaveBeenLastCalledWith('', 'no', 1);
      expect(screen.getByText('Luca Neri')).toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText('Show'), 'Everybody');
      await user.type(screen.getByLabelText('Search by name or e-mail'), 'anna');
      await waitFor(() => expect(admin.listRsvps).toHaveBeenLastCalledWith('anna', 'all', 1));
      expect(await screen.findByText('2 replies', { selector: '[role=status]' })).toBeInTheDocument();
      // The headcount is about everybody, whatever the filter.
      expect(within(screen.getByLabelText('Headcount')).getByText('25 people')).toBeInTheDocument();

      await user.type(screen.getByLabelText('Search by name or e-mail'), 'zzz');
      expect(await screen.findByText('No reply matches.')).toBeInTheDocument();
    });

    it('says so when nobody has replied yet', async () => {
      openRsvps(
        fakeAdmin({
          listRsvps: vi.fn(async () => ({
            items: [],
            page: 1,
            perPage: 20,
            totalItems: 0,
            totalPages: 1,
            summary: { replies: 0, attending: 0, declined: 0, guests: 0 },
          })),
        }),
      );
      expect(await screen.findByText('Nobody has replied yet.')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
    });

    it('offers to try again when the replies cannot be loaded', async () => {
      const listRsvps = vi
        .fn()
        .mockRejectedValueOnce(new AdminError('network', 'The server cannot be reached.'))
        .mockImplementation(async (query: string, attending: RsvpFilter, page: number) =>
          listReplies(query, attending, page),
        );
      openRsvps(fakeAdmin({ listRsvps }));

      expect(await screen.findByRole('alert')).toHaveTextContent('The server cannot be reached.');
      await userEvent.setup().click(screen.getByRole('button', { name: '↻' }));
      expect(await screen.findByText('25 replies')).toBeInTheDocument();
    });
  });

  describe('prints', () => {
    const cardImage =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 336"><rect width="240" height="336"/></svg>';
    let createObjectURL: ReturnType<typeof vi.fn>;
    let click: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      window.localStorage.clear();
      // The card images of the posters (public/cards/clubs/<rank>.svg).
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => ({ ok: true, url, text: async () => cardImage })),
      );
      // Downloads: the file is handed to a link that is clicked.
      createObjectURL = vi.fn((_blob: Blob) => 'blob:file');
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      click.mockRestore();
    });

    const downloaded = async () => ({
      name: (click.mock.contexts.at(-1) as HTMLAnchorElement).download,
      content: await (createObjectURL.mock.calls.at(-1)![0] as Blob).text(),
    });

    const open = (sub: string, admin = fakeAdmin(), repository = fakeRepository()) => {
      const { router } = renderPage(repository, vi.fn(), `/area/site/prints${sub}`, admin);
      return { admin, repository, router };
    };

    it('has one sub-tab each for the logo, the invitations and the posters', async () => {
      const { router } = open('');
      const tabs = within(screen.getByRole('tablist', { name: 'Prints' })).getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual(['Logo', 'Invitations', 'Clubs posters']);
      expect(screen.getByRole('tab', { name: 'Logo' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByRole('img', { name: 'Logo G V' })).toBeInTheDocument();

      await userEvent.setup().click(screen.getByRole('tab', { name: 'Invitations' }));
      expect(router.state.location.pathname).toBe('/area/site/prints/invitations');
      expect(await screen.findByLabelText('Website address in the QR codes')).toBeInTheDocument();
    });

    describe('logo', () => {
      it('follows every choice in the preview, and downloads it', async () => {
        open('/logo');
        const user = userEvent.setup();
        await screen.findByRole('img', { name: 'Logo G V' });

        await user.clear(screen.getByLabelText('First letter'));
        await user.type(screen.getByLabelText('First letter'), 'd');
        await user.clear(screen.getByLabelText('Second letter'));
        await user.type(screen.getByLabelText('Second letter'), 's');
        // Crossed letters have no separator.
        expect(screen.getByText(/Crossed letters have no separator/)).toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: 'Side by side' }));
        await user.click(screen.getByRole('radio', { name: 'heart' }));
        await user.click(
          within(screen.getByRole('group', { name: 'Colour of the separator' })).getByRole('radio', { name: 'Gold' }),
        );
        await user.click(screen.getByRole('radio', { name: 'Times New Roman' }));
        await user.click(screen.getByRole('radio', { name: 'Stile 01' }));
        await user.click(
          within(screen.getByRole('group', { name: 'Colour of the border' })).getByRole('radio', { name: 'Sage' }),
        );

        const preview = screen.getByRole('img', { name: 'Logo D S' });
        const { serif } = await import('../../../../brand/glyphs/serif');
        expect(preview.innerHTML).toContain(serif.glyphs.D.d);
        expect(preview.innerHTML).toContain('fill="#b08d48"');

        await user.click(screen.getByRole('button', { name: 'SVG: Logo D S' }));
        const file = await downloaded();
        expect(file.name).toBe('logo-ds.svg');
        expect(file.content).toContain(serif.glyphs.S.d);
        expect(file.content).toContain('<title>Logo D S</title>');
      });

      it('moves and resizes each letter with its buttons, saved with the design', async () => {
        const designs: DesignStore = {};
        open('/logo', fakeAdmin({}, designs));
        const user = userEvent.setup();
        await screen.findByRole('img', { name: 'Logo G V' });
        const first = screen.getByRole('group', { name: 'Position and size of the first letter' });
        expect(
          within(first)
            .getAllByRole('button')
            .map((button) => button.getAttribute('aria-label')),
        ).toEqual([
          'Make the first letter bigger',
          'Move the first letter up',
          'Make the first letter smaller',
          'Move the first letter left',
          'Move the first letter down',
          'Move the first letter right',
        ]);
        // No controls for the separator.
        expect(screen.queryByRole('group', { name: /Position and size of the separator/ })).not.toBeInTheDocument();

        const preview = () => screen.getByRole('img', { name: 'Logo G V' }).innerHTML;
        const before = preview();
        await user.click(within(first).getByRole('button', { name: 'Make the first letter smaller' }));
        await user.click(within(first).getByRole('button', { name: 'Move the first letter down' }));
        expect(preview()).not.toBe(before);
        await waitFor(
          () =>
            expect(designs.logo).toMatchObject({
              adjustments: [
                { x: 0, y: 1, size: 95 },
                { x: 0, y: 0, size: 100 },
              ],
            }),
          {
            timeout: 3000,
          },
        );

        // Back where it was.
        await user.click(within(first).getByRole('button', { name: 'Put the first letter back where it was' }));
        expect(preview()).toBe(before);
      });

      it('refuses a move that would take the letter out of the area, with a warning', async () => {
        const designs: DesignStore = {};
        const admin = fakeAdmin({}, designs);
        open('/logo', admin);
        const user = userEvent.setup();
        await screen.findByRole('img', { name: 'Logo G V' });
        const second = screen.getByRole('group', { name: 'Position and size of the second letter' });
        const preview = () => screen.getByRole('img', { name: 'Logo G V' }).innerHTML;
        const before = preview();

        // The letters already fill their area: bigger is too big.
        await user.click(within(second).getByRole('button', { name: 'Make the second letter bigger' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
          'The second letter would go out of the area for the letters: nothing changed.',
        );
        expect(preview()).toBe(before);
        expect(admin.savePrintDesign).not.toHaveBeenCalled();

        // A change that fits clears the warning.
        await user.click(within(second).getByRole('button', { name: 'Make the second letter smaller' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(preview()).not.toBe(before);
      });

      it('puts the letters back when a new style is picked, not for a new colour', async () => {
        const designs: DesignStore = {
          logo: {
            letters: ['A', 'B'],
            font: 'sans',
            arrangement: 'aligned',
            adjustments: [
              { x: 0, y: 0, size: 100 },
              { x: 0, y: -12, size: 90 },
            ],
          },
        };
        open('/logo', fakeAdmin({}, designs));
        const user = userEvent.setup();
        await screen.findByRole('img', { name: 'Logo A B' });
        const reset = () => screen.queryByRole('button', { name: 'Put the second letter back where it was' });
        expect(reset()).toBeInTheDocument();

        // A colour is not a style: the refinement stays.
        const colours = screen.getByRole('group', { name: 'Colour of the second letter' });
        await user.click(within(colours).getAllByRole('radio')[3]);
        expect(reset()).toBeInTheDocument();

        // A border lays the letters out again: both start over, and that is saved.
        await user.click(screen.getByRole('radio', { name: 'Stile 01' }));
        expect(reset()).not.toBeInTheDocument();
        expect(screen.queryByText(/goes beyond the area/)).not.toBeInTheDocument();
        await waitFor(
          () =>
            expect(designs.logo).toMatchObject({
              border: 'stile_01',
              adjustments: [
                { x: 0, y: 0, size: 100 },
                { x: 0, y: 0, size: 100 },
              ],
            }),
          { timeout: 3000 },
        );
      });

      it('takes a separator of its own, in any colour', async () => {
        open('/logo');
        const user = userEvent.setup();
        await screen.findByRole('img', { name: 'Logo G V' });
        await user.click(screen.getByRole('radio', { name: 'Diagonal' }));
        await user.click(screen.getByRole('radio', { name: 'other' }));
        await user.type(screen.getByLabelText('Your separator'), '+');
        fireEvent.change(
          within(screen.getByRole('group', { name: 'Colour of the separator' })).getByLabelText('Other colour'),
          {
            target: { value: '#00aa11' },
          },
        );
        const { script } = await import('../../../../brand/glyphs/script');
        const preview = screen.getByRole('img', { name: 'Logo G V' });
        expect(preview.innerHTML).toContain(script.glyphs['+'].d);
        expect(preview.innerHTML).toContain('fill="#00aa11"');
      });

      it('saves every choice on the account: another browser goes on from there', async () => {
        const designs: DesignStore = {};
        const admin = fakeAdmin({}, designs);
        open('/logo', admin);
        const user = userEvent.setup();
        await screen.findByRole('img', { name: 'Logo G V' });
        await user.click(screen.getByRole('radio', { name: 'Stile 01' }));
        await user.clear(screen.getByLabelText('Second letter'));
        await user.type(screen.getByLabelText('Second letter'), 'm');
        await user.click(
          within(screen.getByRole('group', { name: 'Colour of the first letter' })).getByRole('radio', {
            name: 'Navy',
          }),
        );
        expect(screen.getByText('Saving…')).toBeInTheDocument();
        // One save for the whole burst of changes, once they stop.
        await waitFor(() => expect(admin.savePrintDesign).toHaveBeenCalledTimes(1), { timeout: 3000 });
        expect(await screen.findByText(/Saved ✓/)).toBeInTheDocument();
        expect(designs.logo).toMatchObject({
          letters: ['G', 'M'],
          border: 'stile_01',
          colors: ['#2f3e5c', '#c24f78'],
        });

        // Another browser: nothing in its storage, the same account.
        cleanup();
        window.localStorage.clear();
        open('/logo', fakeAdmin({}, designs));
        expect(await screen.findByRole('img', { name: 'Logo G M' })).toBeInTheDocument();
        // The form shows the saved choices, so it matches the picture.
        expect(screen.getByLabelText('Second letter')).toHaveValue('M');
        expect(screen.getByRole('radio', { name: 'Stile 01' })).toBeChecked();
        expect(
          within(screen.getByRole('group', { name: 'Colour of the first letter' })).getByRole('radio', {
            name: 'Navy',
          }),
        ).toBeChecked();

        await user.click(screen.getByRole('button', { name: 'Start again' }));
        expect(screen.getByRole('img', { name: 'Logo G V' })).toBeInTheDocument();
      });

      it('moves a design made in this browser before to the account', async () => {
        window.localStorage.setItem(
          'wedding.prints.logo.v1',
          JSON.stringify({ letters: ['R', 'M'], border: 'stile_01' }),
        );
        const designs: DesignStore = {};
        const admin = fakeAdmin({}, designs);
        open('/logo', admin);
        expect(await screen.findByRole('img', { name: 'Logo R M' })).toBeInTheDocument();
        await waitFor(() => expect(designs.logo).toMatchObject({ letters: ['R', 'M'], border: 'stile_01' }));
        expect(window.localStorage.getItem('wedding.prints.logo.v1')).toBeNull();
      });

      it('never draws what is unsafe or unknown in a saved design', async () => {
        open(
          '/logo',
          fakeAdmin(
            {},
            { logo: { letters: ['<', 'b'], colors: ['"/><script>alert(1)</script>', '#00aa11'], border: 'nonsense' } },
          ),
        );
        const preview = await screen.findByRole('img', { name: 'Logo < B' });
        expect(preview.innerHTML).not.toContain('<script');
        expect(preview.innerHTML).toContain('fill="#6d3350"');
        expect(preview.innerHTML).toContain('fill="#00aa11"');
        expect(screen.getByRole('radio', { name: 'None', checked: true })).toBeInTheDocument();
      });

      it('says when a change could not be saved, and tries again', async () => {
        const admin = fakeAdmin({
          savePrintDesign: vi
            .fn()
            .mockRejectedValueOnce(new AdminError('network', 'The server cannot be reached.'))
            .mockResolvedValue({ design: {}, updated: null }),
        });
        open('/logo', admin);
        const user = userEvent.setup();
        await screen.findByRole('img', { name: 'Logo G V' });
        await user.click(screen.getByRole('radio', { name: 'Stile 01' }));
        expect(
          await screen.findByText('Not saved: The server cannot be reached.', {}, { timeout: 3000 }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText(/Saved ✓/)).toBeInTheDocument();
        expect(admin.savePrintDesign).toHaveBeenCalledTimes(2);
      });
    });

    describe('invitations', () => {
      const card = () => screen.getByRole('img', { name: 'Invitation' }).innerHTML;
      const ready = async () => waitFor(() => expect(card()).toContain('<svg'));

      it('makes the invitation from the site settings, with the QR code of the site', async () => {
        const { admin, repository } = open('/invitations');
        await ready();
        expect(card()).toContain('width="210mm" height="297mm"');
        expect(card()).toContain('You are invited');
        expect(card()).toContain('Giulia <tspan fill="#c24f78">&amp;</tspan> Marco');
        expect(card()).toContain('>at 16:00<');
        expect(card()).toContain('Code for the private area: #wedding');
        // A real QR code, for the address the page is opened at.
        expect(card()).toContain('shape-rendering="crispEdges"');
        expect(screen.getByLabelText('Website address in the QR codes')).toHaveValue(window.location.origin);
        // The latest settings, not the ones cached by the page.
        expect(repository.load).toHaveBeenCalled();
        expect(admin.getSettings).toHaveBeenCalled();
      });

      it('follows the choices: size, names, texts, language, QR code, background, decorations', async () => {
        open('/invitations');
        const user = userEvent.setup();
        await ready();

        await user.click(screen.getByRole('radio', { name: /Square/ }));
        expect(card()).toContain('width="150mm" height="150mm"');
        await user.click(screen.getByRole('radio', { name: 'A couple' }));
        expect(card()).toContain('You are both invited');

        await user.clear(screen.getByLabelText('Title', { exact: true }));
        await user.type(screen.getByLabelText('Title', { exact: true }), 'Save the date');
        await user.clear(screen.getByLabelText('Subtitle'));
        expect(card()).toContain('Save the date');
        expect(card()).not.toContain('to celebrate');
        await user.click(screen.getAllByRole('button', { name: 'Default text' })[0]);
        expect(card()).toContain('You are both invited');

        await user.selectOptions(screen.getByLabelText('Language of the invitation'), 'Italiano');
        expect(card()).toContain('Vi invitiamo');
        expect(card()).toMatch(/Sabato,? 19 giugno 2027/);

        await user.click(screen.getByRole('checkbox', { name: /Show the QR code/ }));
        expect(card()).not.toContain('Rispondete entro');
        expect(screen.queryByLabelText('Text next to the QR code')).not.toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Colour shading' }));
        await user.click(
          within(screen.getByRole('group', { name: 'Colour of the shading' })).getByRole('radio', { name: 'Sage' }),
        );
        expect(card()).toContain('stop-color="#d9e4cf"');

        await user.click(screen.getByRole('radio', { name: 'Hearts' }));
        await user.click(
          within(screen.getByRole('group', { name: 'Colour of the decorations' })).getByRole('radio', { name: 'Pink' }),
        );
        expect(card()).toContain('fill="#c24f78" fill-opacity="0.85"');
        await user.click(
          within(screen.getByRole('group', { name: 'Side decorations' })).getByRole('radio', { name: 'None' }),
        );
        expect(card()).not.toContain('rotate(180)');
      });

      it('adds a faint background pattern from the files, in any colour and strength, saved with the design', async () => {
        const designs: DesignStore = {};
        open('/invitations', fakeAdmin({}, designs));
        const user = userEvent.setup();
        await ready();
        const patterns = screen.getByRole('group', { name: 'Pattern' });
        // "None", then one choice per file, named after it.
        expect(within(patterns).getAllByRole('radio')).toHaveLength(PATTERNS.length);
        expect(within(patterns).getByRole('radio', { name: 'None' })).toBeChecked();
        expect(card()).not.toContain('invitation-pattern');
        expect(screen.queryByLabelText('Strength of the pattern')).not.toBeInTheDocument();

        const first = PATTERNS[1];
        await user.click(within(patterns).getByRole('radio', { name: fileLabel(first) }));
        expect(card()).toContain('fill="#6d3350" fill-opacity="0.15" mask="url(#invitation-pattern-mask)"');
        const strength = screen.getByLabelText('Strength of the pattern');
        expect(strength).toHaveValue('15');
        fireEvent.change(strength, { target: { value: '40' } });
        expect(card()).toContain('fill-opacity="0.4" mask="url(#invitation-pattern-mask)"');
        expect(screen.getByText('40%')).toBeInTheDocument();
        await user.click(
          within(screen.getByRole('group', { name: 'Colour of the pattern' })).getByRole('radio', { name: 'Gold' }),
        );
        expect(card()).toContain('fill="#b08d48" fill-opacity="0.4" mask="url(#invitation-pattern-mask)"');
        await waitFor(
          () =>
            expect(designs.invitation).toMatchObject({ pattern: first, patternColor: '#b08d48', patternOpacity: 40 }),
          { timeout: 3000 },
        );

        await user.click(within(patterns).getByRole('radio', { name: 'None' }));
        expect(card()).not.toContain('invitation-pattern');
      });

      it('lists the choices decorations first, then background, pattern, and the card itself', async () => {
        open('/invitations');
        const user = userEvent.setup();
        await ready();
        await user.click(
          within(screen.getByRole('group', { name: 'Side decorations' })).getByRole('radio', { name: 'Plants' }),
        );
        await user.click(
          within(screen.getByRole('group', { name: 'Pattern' })).getByRole('radio', {
            name: fileLabel(PATTERNS[1]),
          }),
        );
        const options = [
          screen.getByRole('group', { name: 'Position and size of the decorations and the logo' }),
          screen.getByRole('group', { name: 'Side decorations' }),
          screen.getByRole('group', { name: 'Colour of the decorations' }),
          screen.getByRole('group', { name: 'Background' }),
          screen.getByRole('group', { name: 'Pattern' }),
          screen.getByRole('group', { name: 'Colour of the pattern' }),
          screen.getByLabelText('Strength of the pattern'),
          screen.getByRole('group', { name: 'Size' }),
          screen.getByLabelText('Language of the invitation'),
          screen.getByLabelText('Title', { exact: true }),
          screen.getByRole('checkbox', { name: /Show the QR code/ }),
        ];
        // Each one after the one before it in the page.
        for (let i = 1; i < options.length; i++) {
          expect(options[i - 1].compareDocumentPosition(options[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
      });

      it('draws picture patterns in their own colours, at the chosen strength', async () => {
        open('/invitations');
        const user = userEvent.setup();
        await ready();
        const patterns = screen.getByRole('group', { name: 'Pattern' });
        await user.click(within(patterns).getByRole('radio', { name: 'Pattern 08' }));
        expect(screen.queryByRole('group', { name: 'Colour of the pattern' })).not.toBeInTheDocument();
        expect(screen.getByText(/This pattern keeps its own colours/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Strength of the pattern'), { target: { value: '50' } });
        expect(card()).toContain('fill="url(#invitation-pattern-tile)" opacity="0.5"');
        // A drawing again: its colour can be chosen.
        await user.click(within(patterns).getByRole('radio', { name: 'Pattern 01' }));
        expect(screen.getByRole('group', { name: 'Colour of the pattern' })).toBeInTheDocument();
      });

      it('moves and resizes the logo too, while it is shown', async () => {
        const designs: DesignStore = {};
        open('/invitations', fakeAdmin({}, designs));
        const user = userEvent.setup();
        await ready();
        await user.click(
          within(screen.getByRole('group', { name: 'Side decorations' })).getByRole('radio', { name: 'None' }),
        );
        // No decoration, but the logo: the section is there, with the logo alone.
        const section = screen.getByRole('group', { name: 'Position and size of the decorations and the logo' });
        expect(within(section).queryByRole('group', { name: /top-left decoration/ })).not.toBeInTheDocument();
        const logo = within(section).getByRole('group', { name: 'Position and size of the logo' });
        await user.click(within(logo).getByRole('button', { name: 'Make the logo bigger' }));
        await user.click(within(logo).getByRole('button', { name: 'Move the logo down' }));
        expect(card()).toMatch(/scale\(1\.05\) translate\(/);
        await waitFor(() => expect(designs.invitation).toMatchObject({ logoAdjustment: { x: 0, y: 1, size: 105 } }), {
          timeout: 3000,
        });
        await user.click(within(logo).getByRole('button', { name: 'Put the logo back where it was' }));
        expect(card()).not.toMatch(/scale\(1\.05\) translate\(/);

        // Without the logo, nothing to move.
        await user.click(screen.getByRole('checkbox', { name: /Show the logo/ }));
        expect(
          screen.queryByRole('group', { name: 'Position and size of the decorations and the logo' }),
        ).not.toBeInTheDocument();
      });

      it('uses watercolour pictures in their own colours, and moves and resizes each corner', async () => {
        const designs: DesignStore = {};
        open('/invitations', fakeAdmin({}, designs));
        const user = userEvent.setup();
        await ready();
        const decorations = screen.getByRole('group', { name: 'Side decorations' });

        // A drawing: the colour can be chosen.
        await user.click(within(decorations).getByRole('radio', { name: 'Plants' }));
        expect(screen.getByRole('group', { name: 'Colour of the decorations' })).toBeInTheDocument();

        // A picture: its own colours, embedded once and used in both corners.
        await user.click(within(decorations).getByRole('radio', { name: 'Watercolour peonies' }));
        expect(screen.queryByRole('group', { name: 'Colour of the decorations' })).not.toBeInTheDocument();
        expect(screen.getByText('This decoration keeps its own colours.')).toBeInTheDocument();
        expect(card().match(/<use xlink:href="#invitation-decoration"/g)).toHaveLength(2);

        // Each corner has its own buttons, in the card's directions.
        const topLeft = screen.getByRole('group', { name: 'Position and size of the top-left decoration' });
        const bottomRight = screen.getByRole('group', { name: 'Position and size of the bottom-right decoration' });
        await user.click(within(topLeft).getByRole('button', { name: 'Make the top-left decoration bigger' }));
        await user.click(within(topLeft).getByRole('button', { name: 'Move the top-left decoration right' }));
        await user.click(within(bottomRight).getByRole('button', { name: 'Move the bottom-right decoration up' }));
        // A step is 2% of 210 mm; the top left grows by 5%.
        expect(card()).toContain('transform="translate(4.2 0) scale(1.05)"');
        expect(card()).toContain('transform="translate(210 292.8) rotate(180) scale(1)"');
        await waitFor(
          () =>
            expect(designs.invitation).toMatchObject({
              decoration: 'watercolour_peonies',
              decorationAdjustments: [
                { x: 1, y: 0, size: 105 },
                { x: 0, y: -1, size: 100 },
              ],
            }),
          { timeout: 3000 },
        );

        // Nothing stops it at the edge: it can go off the card.
        const smaller = within(bottomRight).getByRole('button', { name: 'Make the bottom-right decoration smaller' });
        expect(smaller).toBeEnabled();
        await user.click(
          within(bottomRight).getByRole('button', { name: 'Put the bottom-right decoration back where it was' }),
        );
        expect(card()).toContain('transform="translate(210 297) rotate(180) scale(1)"');

        // Another decoration starts again in its corners.
        await user.click(within(decorations).getByRole('radio', { name: 'Watercolour tropical' }));
        expect(card()).toContain('transform="translate(0 0) scale(1)"');
        expect(
          screen.queryByRole('button', { name: 'Put the top-left decoration back where it was' }),
        ).not.toBeInTheDocument();
      });

      it('shows the logo designed in the Logo tab, or none', async () => {
        open('/invitations', fakeAdmin({}, { logo: { letters: ['A', 'B'], font: 'sans' } }));
        const user = userEvent.setup();
        await ready();
        const { sans } = await import('../../../../brand/glyphs/sans');
        expect(card()).toContain(sans.glyphs.A.d);
        await user.click(screen.getByRole('checkbox', { name: /Show the logo/ }));
        expect(card()).not.toContain(sans.glyphs.A.d);
      });

      it('downloads the card, and warns when the QR code would point to this computer', async () => {
        open('/invitations');
        const user = userEvent.setup();
        await ready();
        await user.click(screen.getByRole('button', { name: 'SVG: Invitation' }));
        const file = await downloaded();
        expect(file.name).toBe('invitation-a4-portrait.svg');
        expect(file.content).toMatch(/^<\?xml/);

        const website = screen.getByLabelText('Website address in the QR codes');
        await user.clear(website);
        await user.type(website, 'http://localhost:5173');
        expect(await screen.findByText(/only works on this computer/)).toBeInTheDocument();
        await user.clear(website);
        await user.type(website, 'https://gioevale.com/');
        await waitFor(() => expect(card()).toContain('>gioevale.com<'));
        expect(screen.queryByText(/only works on this computer/)).not.toBeInTheDocument();
      });
    });

    it('makes one poster per club, and points out the riddles still missing', async () => {
      const { admin } = open('/posters');
      expect(
        await screen.findByText('1 club has no riddle or solution yet: its QR page says “not available yet”.'),
      ).toBeInTheDocument();
      const posters = screen.getAllByRole('img', { name: /^Poster of the / });
      expect(posters).toHaveLength(13);
      expect(posters[6].innerHTML).toContain(`${window.location.origin}/area/riddles/code7`);
      expect(posters[6].innerHTML).toContain('Scan me to win the 7 of clubs');
      expect(screen.getByRole('img', { name: 'Poster of the 5 of clubs' }).closest('li')!.className).toMatch(
        /posterTodo/,
      );
      expect(screen.getByRole('button', { name: 'Print all / PDF (A3): Clubs posters' })).toBeEnabled();

      const calls = vi.mocked(admin.getRiddleCodes).mock.calls.length;
      await userEvent.setup().click(screen.getByRole('button', { name: '↻ Regenerate' }));
      await waitFor(() => expect(admin.getRiddleCodes).toHaveBeenCalledTimes(calls + 1));
    });
  });
});
