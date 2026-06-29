import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('homepage accessibility', () => {
  it('has no axe violations on the homepage', async () => {
    window.history.replaceState({}, '', '/');

    const { container } = render(<App />);
    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });

  it('exposes keyboard-accessible navigation and copy controls', async () => {
    window.history.replaceState({}, '', '/');
    const user = userEvent.setup();

    render(<App />);

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();

    const scanTab = screen.getByRole('tab', { name: 'scan.ts' });
    await user.click(scanTab);
    expect(scanTab).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: /copy scan\.ts code example/i }));

    await waitFor(() => {
      expect(screen.getByText(/scan\.ts copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it('renders the FAQ page with accordion entries', async () => {
    window.history.replaceState({}, '', '/faq');

    render(<App />);

    expect(await screen.findByRole('heading', { name: /faq/i, level: 1 })).toBeInTheDocument();
    expect(
      (await screen.findAllByRole('button', { name: /show answer for/i })).length,
    ).toBeGreaterThanOrEqual(20);
  });
});
