import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('custom 404 page', () => {
  it('renders the NotFound page for an unknown route', async () => {
    window.history.replaceState({}, '', '/this-route-does-not-exist');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /too stealth for us/i }),
    ).toBeInTheDocument();
  });

  it('exposes the four suggested links with correct destinations', async () => {
    window.history.replaceState({}, '', '/nope');

    render(<App />);

    const suggestions = within(await screen.findByRole('region', { name: /suggested pages/i }));
    expect(suggestions.getByRole('link', { name: /^Home/ })).toHaveAttribute('href', '/');
    expect(suggestions.getByRole('link', { name: /^Docs/ })).toHaveAttribute(
      'href',
      'https://docs.usewraith.xyz',
    );
    expect(suggestions.getByRole('link', { name: /^Demo/ })).toHaveAttribute(
      'href',
      'https://demo.usewraith.xyz',
    );
    expect(suggestions.getByRole('link', { name: /^Console/ })).toHaveAttribute(
      'href',
      'https://console.usewraith.xyz',
    );
    expect(await screen.findByRole('link', { name: /report it on github/i })).toHaveAttribute(
      'href',
      'https://github.com/wraith-protocol/www/issues/new',
    );
  });

  it('has no axe violations', async () => {
    window.history.replaceState({}, '', '/missing');

    const { container } = render(<App />);

    // Wait for the page to load before running axe
    await screen.findByRole('heading', { level: 1, name: /too stealth for us/i });

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
