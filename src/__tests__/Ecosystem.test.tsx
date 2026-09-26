import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import PartnerStrip from '../components/PartnerStrip';
import ecosystemData from '../data/ecosystem.json';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Ecosystem page (/ecosystem)', () => {
  it('renders the ecosystem page for the /ecosystem route', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /ecosystem & partners/i }),
    ).toBeInTheDocument();
  });

  it('renders all partner categories as section headings', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    for (const cat of ecosystemData.categories) {
      // Skip categories with no partners
      const hasPartners = ecosystemData.partners.some((p) => p.category === cat.id);
      if (hasPartners) {
        expect(
          await screen.findByRole('heading', { level: 2, name: cat.label }),
        ).toBeInTheDocument();
      }
    }
  });

  it('renders a card for every partner in the data file', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    // Wait for the page to render
    await screen.findByRole('heading', { level: 1, name: /ecosystem & partners/i });

    // All partner names should be visible on the page
    for (const partner of ecosystemData.partners) {
      expect(screen.getByText(partner.name)).toBeInTheDocument();
    }
  });

  it('links every partner card to a real, absolute URL', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    await screen.findByRole('heading', { level: 1, name: /ecosystem & partners/i });

    const links = screen.getAllByRole('link');
    const partnerLinks = links.filter((l) =>
      ecosystemData.partners.some((p) => l.getAttribute('href') === p.link),
    );

    expect(partnerLinks.length).toBeGreaterThanOrEqual(ecosystemData.partners.length);

    for (const link of partnerLinks) {
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(() => new URL(href as string)).not.toThrow();
    }
  });

  it('opens every partner link in a new tab with noopener noreferrer', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    await screen.findByRole('heading', { level: 1, name: /ecosystem & partners/i });

    const links = screen.getAllByRole('link');
    const partnerLinks = links.filter((l) =>
      ecosystemData.partners.some((p) => l.getAttribute('href') === p.link),
    );

    for (const link of partnerLinks) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('shows the integration count badge on the page', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    expect(
      await screen.findByText(`${ecosystemData.partners.length} INTEGRATIONS`),
    ).toBeInTheDocument();
  });

  it('has no axe violations on the ecosystem page', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    const { container } = render(<App />);

    // Wait for page to load
    await screen.findByRole('heading', { level: 1, name: /ecosystem & partners/i });

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('renders the back to home link on the ecosystem page', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    await screen.findByRole('heading', { level: 1, name: /ecosystem & partners/i });

    expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
  });
});

describe('PartnerStrip component', () => {
  it('renders the ecosystem integrations heading', () => {
    render(<PartnerStrip />);

    expect(screen.getByText('Ecosystem Integrations')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${ecosystemData.partners.length}\\+ partners`, 'i')),
    ).toBeInTheDocument();
  });

  it('renders all partner short names from ecosystem.json', () => {
    render(<PartnerStrip />);

    for (const partner of ecosystemData.partners) {
      // Each name appears in the visible span + tooltip, and duplicated for marquee
      const matches = screen.getAllByText(partner.shortName);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('links each partner item to an absolute URL', () => {
    render(<PartnerStrip />);

    const links = screen.getAllByRole('link');
    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(() => new URL(href as string)).not.toThrow();
    }
  });

  it('opens partner links in a new tab with noopener noreferrer', () => {
    render(<PartnerStrip />);

    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('renders the ecosystem section with a marquee-like scroll region', () => {
    render(<PartnerStrip />);

    const section = screen.getByRole('region', { name: /ecosystem partners/i });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-label', 'Ecosystem partners');
  });

  it('renders partner images with alt text', () => {
    render(<PartnerStrip />);

    const images = screen.getAllByRole('img');
    for (const img of images) {
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')).not.toBe('');
    }
  });
});

describe('Ecosystem data integrity', () => {
  it('has at least one partner in the data file', () => {
    expect(ecosystemData.partners.length).toBeGreaterThan(0);
  });

  it('has at least one category in the data file', () => {
    expect(ecosystemData.categories.length).toBeGreaterThan(0);
  });

  it('does not render categories with zero partners on the ecosystem page', async () => {
    window.history.replaceState({}, '', '/ecosystem');

    render(<App />);

    await screen.findByRole('heading', { level: 1, name: /ecosystem & partners/i });

    // The "oracles" category has zero partners — it should not appear on the page
    expect(screen.queryByText('Oracles')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Oracles' })).not.toBeInTheDocument();
  });

  it('every partner references a valid category', () => {
    const categoryIds = new Set(ecosystemData.categories.map((c) => c.id));
    for (const partner of ecosystemData.partners) {
      expect(categoryIds.has(partner.category)).toBe(true);
    }
  });

  it('every partner has a logo path starting with /logos/ecosystem/', () => {
    for (const partner of ecosystemData.partners) {
      expect(partner.logo).toMatch(/^\/logos\/ecosystem\//);
    }
  });

  it('every partner link is a valid absolute URL', () => {
    for (const partner of ecosystemData.partners) {
      expect(() => new URL(partner.link)).not.toThrow();
    }
  });

  it('no partner has an empty name or shortName', () => {
    for (const partner of ecosystemData.partners) {
      expect(partner.name).toBeTruthy();
      expect(partner.shortName).toBeTruthy();
    }
  });

  it('all partner width values are positive numbers', () => {
    for (const partner of ecosystemData.partners) {
      expect(partner.width).toBeGreaterThan(0);
    }
  });
});

describe('Ecosystem page on home route', () => {
  it('renders the PartnerStrip section on the home route', async () => {
    window.history.replaceState({}, '', '/');

    render(<App />);

    // PartnerStrip is synchronous (not lazy), so it should render immediately
    expect(await screen.findByText('Ecosystem Integrations')).toBeInTheDocument();
  });
});
