import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Newsletter from '../pages/Newsletter';
import Footer from '../components/Footer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * NOTE: react-i18next is not initialised in the Vitest environment, so
 * t('some.key') returns the raw key string.  All queries below are written
 * against the rendered HTML rather than translated strings so the suite
 * remains fast and self-contained.
 */

function renderNewsletter() {
  return render(
    <MemoryRouter>
      <Newsletter />
    </MemoryRouter>,
  );
}

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

// ─── Newsletter page ──────────────────────────────────────────────────────────

describe('Newsletter page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ ok: true }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page heading and form elements', () => {
    renderNewsletter();

    // h1 heading is present (renders the raw i18n key)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // email input is present (identified by its HTML id)
    expect(document.getElementById('newsletter-email')).toBeInTheDocument();
    // submit button is present
    expect(
      screen.getAllByRole('button', { name: /newsletter\.submit/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('shows an error message when submitting an empty email', async () => {
    const user = userEvent.setup();
    renderNewsletter();

    await user.click(screen.getByRole('button', { name: /newsletter\.submit/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('shows an error message when submitting a malformed email', async () => {
    const user = userEvent.setup();
    renderNewsletter();

    // Use the input directly via its id
    const emailInput = document.getElementById('newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /newsletter\.submit/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('calls /api/subscribe with the email on valid submission', async () => {
    const user = userEvent.setup();
    renderNewsletter();

    const emailInput = document.getElementById('newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /newsletter\.submit/i }));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        '/api/subscribe',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        }),
      );
    });
  });

  it('shows success state after a 201 response', async () => {
    const user = userEvent.setup();
    renderNewsletter();

    const emailInput = document.getElementById('newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /newsletter\.submit/i }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    // Form should no longer be visible
    expect(screen.queryByRole('button', { name: /newsletter\.submit/i })).not.toBeInTheDocument();
  });

  it('shows an "already subscribed" error on 409 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'already_subscribed' }),
    } as Response);

    const user = userEvent.setup();
    renderNewsletter();

    const emailInput = document.getElementById('newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'existing@example.com');
    await user.click(screen.getByRole('button', { name: /newsletter\.submit/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows a generic error on 500 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const user = userEvent.setup();
    renderNewsletter();

    const emailInput = document.getElementById('newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /newsletter\.submit/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows a generic error when fetch throws a network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    renderNewsletter();

    const emailInput = document.getElementById('newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /newsletter\.submit/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('does not load any third-party scripts or resources', () => {
    renderNewsletter();
    // Confirm there are no <script> tags or iframes in the rendered output
    expect(document.querySelectorAll('script[src]')).toHaveLength(0);
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('links to the privacy policy', () => {
    renderNewsletter();
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });
});

// ─── Footer newsletter widget ─────────────────────────────────────────────────

describe('Footer NewsletterWidget', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ ok: true }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the newsletter widget with an email input and subscribe button', () => {
    renderFooter();
    // The footer widget has id="footer-newsletter-email"
    expect(document.getElementById('footer-newsletter-email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /newsletter\.footerwidget\.subscribe/i }),
    ).toBeInTheDocument();
  });

  it('renders a link to the /newsletter page', () => {
    renderFooter();
    const newsletterLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/newsletter');
    expect(newsletterLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows a short error message on invalid email submission', async () => {
    const user = userEvent.setup();
    renderFooter();

    const emailInput = document.getElementById('footer-newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'bad-email');
    await user.click(screen.getByRole('button', { name: /newsletter\.footerwidget\.subscribe/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('shows success message after successful subscription', async () => {
    const user = userEvent.setup();
    renderFooter();

    const emailInput = document.getElementById('footer-newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'user@example.com');
    await user.click(screen.getByRole('button', { name: /newsletter\.footerwidget\.subscribe/i }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('treats a 409 (already subscribed) as success to avoid user-enumeration', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'already_subscribed' }),
    } as Response);

    const user = userEvent.setup();
    renderFooter();

    const emailInput = document.getElementById('footer-newsletter-email') as HTMLInputElement;
    await user.type(emailInput, 'existing@example.com');
    await user.click(screen.getByRole('button', { name: /newsletter\.footerwidget\.subscribe/i }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
