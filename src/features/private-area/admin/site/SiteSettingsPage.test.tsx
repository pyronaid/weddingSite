import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { defaultContent } from '../../../../config/wedding';
import {
  AdminError,
  type AdminRepository,
  type AdminRsvp,
  type AdminRsvpsPage,
  type AdminUser,
  type AdminUsersPage,
  type RsvpFilter,
} from '../../../../services/admin';
import type { Suit } from '../../../../services/game';
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

function fakeAdmin(overrides: Partial<AdminRepository> = {}): AdminRepository {
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
    getSettings: vi.fn(async () => ({ signupCode: '#wedding' })),
    updateSettings: vi.fn(async (settings) => settings),
    listUsers: vi.fn(async (query: string, page: number) => listGuests(query, page)),
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
        path: '/area/site/:tab?',
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
      expect(tabs.map((tab) => tab.textContent)).toEqual(['General', 'Photos', 'Organisers', 'RSVPs', 'Sign-up code']);
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
      expect(screen.getByRole('tab', { name: 'Sign-up code' })).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'General' })).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(router.state.location.pathname).toBe('/area/site/signup-code');
      // Only the selected tab is in the Tab order.
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('tabindex', '-1');
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
});
