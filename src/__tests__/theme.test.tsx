import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

type MatchMediaListener = (event: MediaQueryListEvent) => void;

let prefersDark = false;
const listeners = new Set<MatchMediaListener>();

function installMatchMediaMock() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_event: 'change', listener: MatchMediaListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_event: 'change', listener: MatchMediaListener) => {
        listeners.delete(listener);
      },
      addListener: (listener: MatchMediaListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: MatchMediaListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    }),
  });
}

function setSystemTheme(theme: 'dark' | 'light') {
  prefersDark = theme === 'dark';

  act(() => {
    listeners.forEach((listener) => listener({ matches: prefersDark } as MediaQueryListEvent));
  });
}

function ThemeProbe() {
  const { theme, preference, toggleTheme } = useTheme();

  return (
    <div>
      <p>Theme: {theme}</p>
      <p>Preference: {preference}</p>
      <button onClick={toggleTheme}>Toggle theme</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    prefersDark = false;
    listeners.clear();
    localStorage.clear();
    installMatchMediaMock();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    document.head.innerHTML = '<meta name="theme-color" content="#0e0e0e" />';
  });

  afterEach(() => {
    localStorage.clear();
    listeners.clear();
  });

  it('uses prefers-color-scheme by default', async () => {
    prefersDark = true;

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText('Theme: dark')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(localStorage.getItem('wraith-theme')).toBeNull();
  });

  it('reflects OS theme changes live when there is no explicit override', async () => {
    prefersDark = false;

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText('Theme: light')).toBeInTheDocument();

    setSystemTheme('dark');

    expect(await screen.findByText('Theme: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#0e0e0e',
    );
  });

  it('persists an explicit override across remounts and ignores later OS changes', async () => {
    prefersDark = true;
    const user = userEvent.setup();
    const firstRender = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(screen.getByText('Theme: light')).toBeInTheDocument();
    expect(screen.getByText('Preference: light')).toBeInTheDocument();
    expect(localStorage.getItem('wraith-theme')).toBe('light');

    firstRender.unmount();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText('Theme: light')).toBeInTheDocument();

    setSystemTheme('light');
    setSystemTheme('dark');

    expect(screen.getByText('Theme: light')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#faf9f7',
    );
  });

  it('wires the header toggle to the persisted theme override', async () => {
    prefersDark = true;
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/');

    render(<App />);

    const toggle = screen.getByRole('button', { name: /switch to light theme/i });
    await user.click(toggle);

    expect(localStorage.getItem('wraith-theme')).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
