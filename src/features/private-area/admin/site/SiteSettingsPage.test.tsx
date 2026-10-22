import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { defaultContent } from '../../../../config/wedding';
import { AdminError } from '../../../../services/admin';
import type { AuthService, AuthUser } from '../../../../services/auth';
import type { SiteContent, SiteRepository, SiteSettings } from '../../../../services/site';
import { SiteContentContext } from '../../../../site/SiteContentContext';
import { AuthProvider } from '../../AuthProvider';
import { SiteSettingsPage } from './SiteSettingsPage';

const superAdmin: AuthUser = {
  id: 's1',
  email: 'super@example.com',
  name: 'Sara',
  verified: true,
  isAdmin: true,
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
      repository.content = { ...repository.content, ...settings, gift: { ...settings.gift, iban: settings.gift.iban.replace(/\s+/g, '').toUpperCase() } };
      return repository.content;
    }),
    uploadPhoto: vi.fn(async (slot: string, _image: Blob, alt: string) => {
      repository.content = {
        ...repository.content,
        photos: { ...repository.content.photos, [slot]: { src: 'http://pb/new.jpg', alt } },
        uploaded: [...repository.content.uploaded, slot as never],
      };
      return repository.content;
    }),
    updatePhotoAlt: vi.fn(async () => repository.content),
    resetPhoto: vi.fn(async () => {
      repository.content = { ...repository.content, photos: defaultContent.photos, uploaded: [] };
      return repository.content;
    }),
  };
  return repository;
}

function renderPage(repository: SiteRepository, replace = vi.fn()) {
  render(
    <AuthProvider service={auth}>
      <SiteContentContext.Provider value={{ content: defaultContent, repository, replace }}>
        <MemoryRouter>
          <SiteSettingsPage />
        </MemoryRouter>
      </SiteContentContext.Provider>
    </AuthProvider>,
  );
  return replace;
}

beforeEach(() => {
  // jsdom has no object URLs nor image decoding: preparePhoto sends the file as is.
  globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error('no decoder'));
});

describe('site settings (super admin)', () => {
  it('edits names, date, venues and gift, and saves them for the whole site', async () => {
    const repository = fakeRepository();
    const replace = renderPage(repository);
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
    repository.save = vi
      .fn()
      .mockRejectedValue(new AdminError('validation', 'Please check the highlighted values.', { bic: 'A BIC has 8 or 11 letters and digits.' }));
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
    const replace = renderPage(repository);
    const user = userEvent.setup();

    const hero = await screen.findByRole('article', { name: 'Main photo (top of the page)' });
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
    renderPage(fakeRepository());
    expect(await screen.findByRole('article', { name: 'Around “Location” · Left 1' })).toBeInTheDocument();
    const floating = screen.getByRole('article', { name: 'Floating in the private area · Photo 8' });
    expect(within(floating).getByText('Decorative: no description needed.')).toBeInTheDocument();
  });
});
