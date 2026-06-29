import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('Stellar page and partners section', () => {
  it('renders the Stellar page for the /stellar route', () => {
    window.history.replaceState({}, '', '/stellar');

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /stellar integration/i }),
    ).toBeInTheDocument();
  });

  it('renders the ecosystem partners section with all six partner links', () => {
    window.history.replaceState({}, '', '/stellar');

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 2, name: /ecosystem partners & credits/i }),
    ).toBeInTheDocument();

    const partners = [
      { name: 'Stellar Development Foundation', link: 'https://stellar.org' },
      { name: 'Drips', link: 'https://www.drips.network' },
      { name: 'Freighter', link: 'https://freighter.app' },
      { name: 'Albedo', link: 'https://albedo.link' },
      { name: 'xBull', link: 'https://xbull.app' },
      { name: 'LOBSTR', link: 'https://lobstr.co' },
    ];

    partners.forEach((partner) => {
      // Find the link by its href
      const links = screen.getAllByRole('link');
      const link = links.find((l) => l.getAttribute('href') === partner.link);
      expect(link).toBeDefined();
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('has no axe violations on the Stellar page', async () => {
    window.history.replaceState({}, '', '/stellar');

    const { container } = render(<App />);
    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
