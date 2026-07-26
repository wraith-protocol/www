import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('Home page', () => {
  it('renders the refreshed homepage sections and primary CTAs', async () => {
    window.history.replaceState({}, '', '/');

    render(<App />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /private payments your users can actually use/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: /the core pieces for a real launch/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: /pick the integration path that fits/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: /reference builds and partner previews/i,
      }),
    ).toBeInTheDocument();

    const docsLinks = screen.getAllByRole('link', { name: /read the docs/i });
    expect(docsLinks).toHaveLength(2);
    docsLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://docs.usewraith.xyz');
    });
    expect(screen.getByRole('link', { name: /try the demo/i })).toHaveAttribute(
      'href',
      'https://demo.usewraith.xyz',
    );
    expect(screen.getByRole('link', { name: /view faq/i })).toHaveAttribute('href', '/faq');
    const apiKeyLinks = screen.getAllByRole('link', { name: /get api keys/i });
    expect(apiKeyLinks).toHaveLength(2);
    apiKeyLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://console.usewraith.xyz');
    });
  });
});
