import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import faqData from '../data/faq.json';

describe('FAQ search and category filtering', () => {
  it('has at least 10 more entries than the original 26-entry FAQ', () => {
    expect(faqData.entries.length).toBeGreaterThanOrEqual(36);
  });

  it('filters questions live as the user types', async () => {
    window.history.replaceState({}, '', '/faq');
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole('heading', { name: /faq/i, level: 1 });

    const initialButtons = await screen.findAllByRole('button', {
      name: /(show|hide) answer for/i,
    });
    expect(initialButtons.length).toBe(faqData.entries.length);

    const search = screen.getByRole('searchbox');
    await user.type(search, 'gas');

    const filteredButtons = await screen.findAllByRole('button', {
      name: /(show|hide) answer for/i,
    });
    expect(filteredButtons.length).toBeGreaterThan(0);
    expect(filteredButtons.length).toBeLessThan(initialButtons.length);
    expect(
      screen.getByRole('button', { name: /show answer for are gas fees sponsored/i }),
    ).toBeInTheDocument();
  });

  it('finds entries by tag even when the tag is not in the question text', async () => {
    window.history.replaceState({}, '', '/faq');
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: /faq/i, level: 1 });

    const search = screen.getByRole('searchbox');
    await user.type(search, 'bug bounty');

    expect(
      await screen.findByRole('button', { name: /show answer for is there a bug bounty program/i }),
    ).toBeInTheDocument();
  });

  it('combines category filter with search', async () => {
    window.history.replaceState({}, '', '/faq');
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: /faq/i, level: 1 });

    await user.click(screen.getByRole('button', { name: 'Security and audits' }));
    const search = screen.getByRole('searchbox');
    await user.type(search, 'wallet');

    expect(screen.getByText(/no matching questions/i)).toBeInTheDocument();
  });
});
