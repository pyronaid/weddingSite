import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { defaultContent } from '../config/wedding';
import { HomePage } from '../pages/HomePage';
import type { SiteContent, SiteRepository } from '../services/site';
import { SiteContentProvider } from './SiteContentProvider';

// The page embeds framer-motion scroll effects: jsdom needs these.
beforeAll(() => {
  window.scrollTo = vi.fn();
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
});

beforeEach(() => localStorage.clear());

const italian: SiteContent = {
  ...defaultContent,
  language: 'it',
  couple: { partnerOne: 'Sofia', partnerTwo: 'Luca', hashtag: '#SofiaELuca' },
  tagline: 'Ci sposiamo',
  date: '2028-09-02T17:30:00+02:00',
  timezone: 'Europe/Rome',
  rsvpDeadline: '2028-07-15',
  ceremony: { name: 'Duomo di Lecce', address: 'Piazza del Duomo, Lecce', time: '17:30', mapQuery: 'Duomo di Lecce' },
  reception: null,
  gift: { ...defaultContent.gift, iban: 'DE89370400440532013000', accountHolder: 'Sofia e Luca', bic: '' },
  photos: { ...defaultContent.photos, hero: { src: 'http://pb/hero.jpg', alt: 'Sofia e Luca al mare' } },
  uploaded: ['hero'],
};

const repository = (content: SiteContent | Promise<SiteContent>): SiteRepository => ({
  load: vi.fn(async () => content),
  save: vi.fn(),
  uploadPhoto: vi.fn(),
  updatePhotoAlt: vi.fn(),
  resetPhoto: vi.fn(),
});

function renderHome(site: SiteRepository) {
  return render(
    <SiteContentProvider repository={site}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </SiteContentProvider>,
  );
}

describe('site content', () => {
  it('shows the public page with the content and in the language chosen by the super admin', async () => {
    renderHome(repository(italian));

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sofia & Luca');
    expect(screen.getByText('Ci sposiamo')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sofia e Luca al mare' })).toHaveAttribute('src', 'http://pb/hero.jpg');
    expect(screen.getByRole('heading', { name: 'Il grande giorno' })).toBeInTheDocument();
    // In Italian and in the wedding's time zone.
    expect(screen.getAllByText('sabato 2 settembre 2028').length).toBeGreaterThan(0);
    expect(screen.getByText(/Conferma la tua presenza entro il/)).toHaveTextContent('15 luglio 2028');

    // Only the ceremony: there is no reception.
    const location = screen.getByRole('region', { name: 'Il luogo' });
    expect(within(location).getByText('Cerimonia · 17:30')).toBeInTheDocument();
    expect(within(location).getByText('Piazza del Duomo, Lecce')).toBeInTheDocument();
    expect(within(location).queryByText(/Ricevimento/)).not.toBeInTheDocument();

    expect(screen.getByText('DE89 3704 0044 0532 0130 00')).toBeInTheDocument();
    expect(screen.queryByText('BIC / SWIFT')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copia IBAN' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome e cognome/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Area riservata' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('it');
    expect(document.title).toBe('Sofia & Luca');
  });

  it('shows a loading screen, never the default names, until the content arrives', async () => {
    let resolve: (content: SiteContent) => void = () => {};
    renderHome(repository(new Promise<SiteContent>((done) => (resolve = done))));

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(/Giulia/)).not.toBeInTheDocument();
    resolve(italian);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sofia & Luca');
  });

  it('shows the last content seen at once, then refreshes it', async () => {
    localStorage.setItem('site-content-v1', JSON.stringify({ ...italian, couple: { ...italian.couple, partnerTwo: 'Marco' } }));
    renderHome(repository(italian));

    // From the browser cache, before the server answers.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sofia & Marco');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sofia & Luca'));
    expect(JSON.parse(localStorage.getItem('site-content-v1')!).couple.partnerTwo).toBe('Luca');
  });

  it('falls back to the default content when the server cannot be reached', async () => {
    const site = repository(italian);
    site.load = vi.fn().mockRejectedValue(new Error('offline'));
    renderHome(site);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Giulia & Marco');
    expect(screen.getByRole('heading', { name: 'The Big Day' })).toBeInTheDocument();
  });
});
