import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';
type ThemePreference = Theme | 'system';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  useSystemTheme: () => void;
};

const STORAGE_KEY = 'wraith-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLORS: Record<Theme, string> = {
  dark: '#0e0e0e',
  light: '#faf9f7',
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isTheme = (value: string | null): value is Theme => value === 'dark' || value === 'light';

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
};

const getStoredPreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';

  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : 'system';
  } catch {
    return 'system';
  }
};

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  const metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  metaTheme?.setAttribute('content', THEME_COLORS[theme]);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => getStoredPreference());
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme());

  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setPreference(nextTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Theme persistence should not block the visible preference change.
    }
  }, []);

  const useSystemTheme = useCallback(() => {
    setPreference('system');

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures; the in-memory preference still updates.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, preference, setTheme, toggleTheme, useSystemTheme }),
    [preference, setTheme, theme, toggleTheme, useSystemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
