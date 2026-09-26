import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import TrustStrip from '../components/TrustStrip';
import trustData from '../data/trust.json';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TrustStrip', () => {
  it('renders audit, integration, and uptime badges from trust.json', () => {
    render(<TrustStrip />);

    for (const audit of trustData.audits.items) {
      expect(screen.getByText(audit.label)).toBeInTheDocument();
    }

    expect(screen.getByText(`${trustData.integrations.count}+`)).toBeInTheDocument();
    expect(screen.getByText(`${trustData.uptime.fallbackPercent}%`)).toBeInTheDocument();
  });

  it('links every badge to a real, absolute URL', () => {
    render(<TrustStrip />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(() => new URL(href as string)).not.toThrow();
    }
  });

  it('falls back to the static uptime value with no VITE_UPTIME_API_URL configured', () => {
    render(<TrustStrip />);

    expect(screen.getByText(`${trustData.uptime.fallbackPercent}%`)).toBeInTheDocument();
  });

  it('renders the trust strip on the home route with its key signals', () => {
    window.history.replaceState({}, '', '/');

    render(<App />);

    expect(screen.getByText('Smart Contract Audit')).toBeInTheDocument();
    expect(screen.getByText(`${trustData.integrations.count}+`)).toBeInTheDocument();
    expect(screen.getByText(`${trustData.uptime.fallbackPercent}%`)).toBeInTheDocument();
  });
});
