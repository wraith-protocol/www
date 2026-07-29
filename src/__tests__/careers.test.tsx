import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Careers page', () => {
  it('renders the Careers page for the /careers route', async () => {
    window.history.replaceState({}, '', '/careers');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /not hiring right now/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /how we work/i })).toBeInTheDocument();
  });

  it('links to the GitHub help-wanted issue list', async () => {
    window.history.replaceState({}, '', '/careers');

    render(<App />);

    const link = await screen.findByRole('link', { name: /browse open bounties/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/wraith-protocol/www/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22',
    );
  });

  it('submits the stay-in-touch form to /api/subscribe and shows a success state', async () => {
    window.history.replaceState({}, '', '/careers');
    const user = userEvent.setup();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const emailInput = await screen.findByLabelText(/email address/i);
    await user.type(emailInput, 'careers-test@example.com');
    await user.click(screen.getByRole('button', { name: /stay in touch/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/subscribe',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const options = call?.[1] as RequestInit;
    expect(JSON.parse(options.body as string)).toEqual({
      email: 'careers-test@example.com',
      tag: 'careers',
    });

    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
  });

  it('shows an error message when the subscribe request fails', async () => {
    window.history.replaceState({}, '', '/careers');
    const user = userEvent.setup();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'A valid email address is required.' }),
      }),
    );

    render(<App />);

    const emailInput = await screen.findByLabelText(/email address/i);
    await user.type(emailInput, 'bad@example.com');
    await user.click(screen.getByRole('button', { name: /stay in touch/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email address is required/i);
  });

  it('has no axe violations on the Careers page', async () => {
    window.history.replaceState({}, '', '/careers');

    const { container } = render(<App />);

    await screen.findByRole('heading', { level: 1, name: /not hiring right now/i });

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
