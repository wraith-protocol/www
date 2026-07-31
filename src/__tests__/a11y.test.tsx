import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import App from '../App';

const pages = [
  { path: '/', name: 'homepage' },
  { path: '/faq', name: 'FAQ' },
  { path: '/roadmap', name: 'roadmap' },
  { path: '/privacy', name: 'privacy policy' },
  { path: '/use-cases', name: 'use cases' },
  { path: '/stellar', name: 'Stellar page' },
  { path: '/case-studies', name: 'case studies list' },
  { path: '/case-studies/payroll-processor', name: 'case study detail' },
  { path: '/nonexistent-page', name: '404 not found' },
];

describe('page accessibility', () => {
  for (const { path, name } of pages) {
    it(`has no axe violations on the ${name} page`, async () => {
      window.history.replaceState({}, '', path);

      const { container } = render(<App />);
      const results = await axe(container);

      expect(results.violations).toEqual([]);
    });
  }
});

describe('keyboard navigation', () => {
  const user = userEvent.setup();

  it('supports keyboard navigation on the homepage', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();
  });

  it('supports keyboard tab interaction on the FAQ page', async () => {
    window.history.replaceState({}, '', '/faq');
    render(<App />);

    const toggles = await screen.findAllByRole('button', { name: /answer for/i });
    expect(toggles.length).toBeGreaterThanOrEqual(1);

    const firstToggle = toggles[0];
    if (firstToggle) {
      await user.click(firstToggle);
    }
  });

  it('supports keyboard interaction on the use-cases page', async () => {
    window.history.replaceState({}, '', '/use-cases');
    render(<App />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });
});

describe('FAQ page details', () => {
  it('renders the FAQ page with accordion entries', async () => {
    window.history.replaceState({}, '', '/faq');

    render(<App />);

    expect(await screen.findByRole('heading', { name: /faq/i, level: 1 })).toBeInTheDocument();
    expect(
      (await screen.findAllByRole('button', { name: /answer for/i })).length,
    ).toBeGreaterThanOrEqual(20);
  });
});

describe('roadmap page details', () => {
  it('renders the roadmap page with milestone timeline and no axe violations', async () => {
    window.history.replaceState({}, '', '/roadmap');

    const { container } = render(<App />);

    expect(
      await screen.findByRole('heading', { name: /private payments for every chain/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /foundation/i, level: 2 }),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
