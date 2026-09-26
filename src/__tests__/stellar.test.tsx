import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { getDeployment } from '@wraith-protocol/sdk/chains/stellar';

describe('Stellar page and partners section', () => {
  it('renders the Stellar page for the /stellar route', async () => {
    window.history.replaceState({}, '', '/stellar');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /stellar integration/i }),
    ).toBeInTheDocument();
  });

  it('renders the ecosystem partners section with all six partner links', async () => {
    window.history.replaceState({}, '', '/stellar');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 2, name: /ecosystem partners & credits/i }),
    ).toBeInTheDocument();

    const partners = [
      { name: 'Stellar Development Foundation', link: 'https://stellar.org' },
      { name: 'Drips', link: 'https://www.drips.network' },
      { name: 'Freighter', link: 'https://freighter.app' },
      { name: 'Albedo', link: 'https://albedo.link' },
      { name: 'xBull', link: 'https://xbull.app' },
      { name: 'LOBSTR', link: 'https://lobstr.co' },
    ];

    const links = await screen.findAllByRole('link');
    partners.forEach((partner) => {
      // Find the link by its href
      const link = links.find((l) => l.getAttribute('href') === partner.link);
      expect(link).toBeDefined();
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('renders canonical Stellar deployment addresses with explorer links', async () => {
    window.history.replaceState({}, '', '/stellar');

    render(<App />);

    const deployment = getDeployment('stellar');
    expect(await screen.findByText(deployment.contracts.announcer)).toBeInTheDocument();
    expect(screen.getByText(deployment.contracts.names)).toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();

    const explorerLinks = screen.getAllByRole('link', { name: /view/i });
    expect(explorerLinks).toHaveLength(2);
    for (const link of explorerLinks) {
      expect(link.getAttribute('href')).toMatch(
        /^https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[A-Z0-9]{56}$/,
      );
    }
  });

  it('has no axe violations on the Stellar page', async () => {
    window.history.replaceState({}, '', '/stellar');

    const { container } = render(<App />);

    // Wait for page to load before running axe
    await screen.findByRole('heading', { level: 1, name: /stellar integration/i });

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
