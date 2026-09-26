import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import waveData from '../data/wave.json';

describe('Grants page', () => {
  it('renders the grants page for the /grants route', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /build private payments/i }),
    ).toBeInTheDocument();
  });

  it('renders the current wave section with name and budget', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    const currentWave = waveData.currentWave;
    if (currentWave) {
      expect(
        await screen.findByRole('heading', { level: 2, name: currentWave.name }),
      ).toBeInTheDocument();
      expect(screen.getByText(currentWave.budget)).toBeInTheDocument();
      expect(screen.getAllByText(currentWave.fundingSource).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders the apply button with correct URL when wave is open', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    const currentWave = waveData.currentWave;
    if (currentWave?.status === 'open') {
      const applyLink = await screen.findByRole('link', { name: /apply on drips/i });
      expect(applyLink).toHaveAttribute('href', currentWave.applyUrl);
      expect(applyLink).toHaveAttribute('target', '_blank');
    }
  });

  it('renders eligibility and review criteria lists', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    const currentWave = waveData.currentWave;
    if (currentWave) {
      await screen.findByRole('heading', { level: 3, name: /eligibility/i });
      expect(
        screen.getByRole('heading', { level: 3, name: /review criteria/i }),
      ).toBeInTheDocument();

      for (const item of currentWave.eligibility) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }

      for (const item of currentWave.reviewCriteria) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    }
  });

  it('renders past waves section when past waves exist', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    const pastWaves = waveData.pastWaves;
    if (pastWaves.length > 0) {
      expect(await screen.findByText(/past waves/i)).toBeInTheDocument();

      for (const wave of pastWaves) {
        expect(screen.getByRole('heading', { level: 2, name: wave.name })).toBeInTheDocument();
        expect(screen.getByText((content) => content.startsWith(wave.budget))).toBeInTheDocument();
      }
    }
  });

  it('renders past wave recipients when present', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    const pastWaves = waveData.pastWaves;
    if (pastWaves.length > 0) {
      for (const wave of pastWaves) {
        if (wave.recipients && wave.recipients.length > 0) {
          await screen.findByText(/recipients/i);
          for (const r of wave.recipients) {
            expect(screen.getByText(r.name)).toBeInTheDocument();
            expect(screen.getByText(r.project)).toBeInTheDocument();
            expect(screen.getByText(r.grantAmount)).toBeInTheDocument();
          }
        }
      }
    }
  });

  it('renders the FAQ section with all entries', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 2, name: /frequently asked questions/i }),
    ).toBeInTheDocument();

    const faqEntries = waveData.faq;
    for (const entry of faqEntries) {
      expect(screen.getByText(entry.question)).toBeInTheDocument();
    }
  });

  it('toggles FAQ answers open and closed', async () => {
    window.history.replaceState({}, '', '/grants');
    const user = userEvent.setup();

    render(<App />);

    const faqEntries = waveData.faq;
    if (faqEntries.length > 0) {
      const firstQuestion = faqEntries[0];
      const toggleButton = await screen.findByRole('button', {
        name: new RegExp(firstQuestion?.question ?? ''),
      });

      await user.click(toggleButton);
      expect(screen.getByText(firstQuestion?.answer ?? '')).toBeInTheDocument();

      await user.click(toggleButton);
      expect(screen.queryByText(firstQuestion?.answer ?? '')).not.toBeInTheDocument();
    }
  });

  it('shows Drips as a link in the hero section', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    const dripsLinks = await screen.findAllByRole('link', { name: /drips/i });
    const dripsLink = dripsLinks.find(
      (l) => l.getAttribute('href') === 'https://www.drips.network',
    );
    expect(dripsLink).toBeDefined();
    expect(dripsLink).toHaveAttribute('target', '_blank');
  });

  it('renders the layout header with brand link back home', async () => {
    window.history.replaceState({}, '', '/grants');

    render(<App />);

    const brandLink = await screen.findByRole('link', { name: /^wraith$/i });
    expect(brandLink).toHaveAttribute('href', 'https://usewraith.xyz');
  });

  it('has no axe violations on the grants page', async () => {
    const { axe } = await import('vitest-axe');
    window.history.replaceState({}, '', '/grants');

    const { container } = render(<App />);

    await screen.findByRole('heading', { level: 1, name: /build private payments/i });

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
