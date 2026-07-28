import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import i18n, { changeLocale, SUPPORTED_LOCALES } from '../i18n';

afterEach(() => {
  act(() => {
    changeLocale('en');
  });
});

describe('i18n infrastructure & language switcher', () => {
  it('initializes with supported locales EN and ES', () => {
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('es');
    expect(Object.keys(i18n.options.resources ?? {})).toEqual(expect.arrayContaining(['en', 'es']));
  });

  it('switches language between English and Spanish via header switcher', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/');

    render(<App />);

    // In English initially
    expect(await screen.findByText(/Private payments for every chain/i)).toBeInTheDocument();

    // Click the language switcher button (labeled "ES" in English mode)
    const esButtons = screen.getAllByRole('button', { name: /Switch to ES/i });
    expect(esButtons.length).toBeGreaterThan(0);
    await user.click(esButtons[0]!);

    // Now in Spanish
    expect(await screen.findByText(/Pagos privados para cada cadena/i)).toBeInTheDocument();

    // Click the language switcher button again (labeled "EN" in Spanish mode)
    const enButtons = screen.getAllByRole('button', { name: /Cambiar a EN/i });
    expect(enButtons.length).toBeGreaterThan(0);
    await user.click(enButtons[0]!);

    // Back to English
    expect(await screen.findByText(/Private payments for every chain/i)).toBeInTheDocument();
  });

  it('renders Careers page in both locales', async () => {
    window.history.replaceState({}, '', '/careers');
    const { unmount } = render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /not hiring right now/i }),
    ).toBeInTheDocument();
    unmount();

    act(() => {
      changeLocale('es');
    });

    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /no estamos contratando/i }),
    ).toBeInTheDocument();
  });

  it('renders FAQ page in both locales', async () => {
    window.history.replaceState({}, '', '/faq');
    const { unmount } = render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /faq/i })).toBeInTheDocument();
    unmount();

    act(() => {
      changeLocale('es');
    });

    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /preguntas frecuentes/i }),
    ).toBeInTheDocument();
  });

  it('renders Stellar page in both locales', async () => {
    window.history.replaceState({}, '', '/stellar');
    const { unmount } = render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /stellar integration/i }),
    ).toBeInTheDocument();
    unmount();

    act(() => {
      changeLocale('es');
    });

    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /stellar integration/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/RED DE PRUEBAS EN VIVO/i)).toBeInTheDocument();
  });
});
