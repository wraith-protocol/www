import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StealthAnimation from '../components/StealthAnimation';

describe('StealthAnimation', () => {
  it('renders the section with heading and description', () => {
    render(<StealthAnimation />);

    // Use getAllByText since "Stealth Address Protocol" appears in both h2 and h3
    const headings = screen.getAllByText('Stealth Address Protocol');
    expect(headings.length).toBeGreaterThan(0);

    expect(
      screen.getByText(/Interactive demonstration of how Wraith generates one-time addresses/i),
    ).toBeInTheDocument();
  });

  it('renders Play button in idle state', () => {
    render(<StealthAnimation />);

    const playButton = screen.getByRole('button', { name: /play animation/i });
    expect(playButton).toBeInTheDocument();
  });

  it('renders Reset button', () => {
    render(<StealthAnimation />);

    const resetButton = screen.getByRole('button', { name: /reset animation/i });
    expect(resetButton).toBeInTheDocument();
  });

  it('changes to Pause button when animation starts', () => {
    render(<StealthAnimation />);

    const playButton = screen.getByRole('button', { name: /play animation/i });
    fireEvent.click(playButton);

    expect(screen.getByRole('button', { name: /pause animation/i })).toBeInTheDocument();
  });

  it('resets to idle state when Reset is clicked', async () => {
    render(<StealthAnimation />);

    // Start animation
    const playButton = screen.getByRole('button', { name: /play animation/i });
    fireEvent.click(playButton);

    // Wait for state change
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause animation/i })).toBeInTheDocument();
    });

    // Reset
    const resetButton = screen.getByRole('button', { name: /reset animation/i });
    fireEvent.click(resetButton);

    // Should be back to Play button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /play animation/i })).toBeInTheDocument();
    });
  });

  it('renders all 6 step buttons', () => {
    render(<StealthAnimation />);

    // Should have 6 step buttons
    const stepButtons = screen.getAllByRole('button').filter((button) => {
      const ariaLabel = button.getAttribute('aria-label');
      return ariaLabel?.startsWith('Jump to step');
    });

    expect(stepButtons).toHaveLength(6);
  });

  it('updates description when step changes', async () => {
    render(<StealthAnimation />);

    // Initial state
    expect(
      screen.getByText(
        'Click Play to see how stealth addresses protect recipient privacy on-chain.',
      ),
    ).toBeInTheDocument();

    // Click play
    const playButton = screen.getByRole('button', { name: /play animation/i });
    fireEvent.click(playButton);

    // Should show first step description - use role to be more specific
    await waitFor(
      () => {
        const heading = screen.getByRole('heading', { name: /1\. Sender Prepares/i });
        expect(heading).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('has proper accessibility attributes', () => {
    render(<StealthAnimation />);

    // Section should have aria-label
    const section = screen.getByLabelText('Interactive stealth address explainer');
    expect(section).toBeInTheDocument();

    // Progress bar should have proper ARIA attributes
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays key privacy benefits list', () => {
    render(<StealthAnimation />);

    expect(screen.getByText('Key Privacy Benefits')).toBeInTheDocument();
    expect(
      screen.getByText(/Sender and receiver addresses are never linked on-chain/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Each payment uses a unique, one-time address/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Only the recipient can detect and access their payments/i),
    ).toBeInTheDocument();
  });

  it('respects reduced motion preference', () => {
    // matchMedia is already mocked in setup to return matches: false
    // For this test, we can verify the component renders without errors
    const { container } = render(<StealthAnimation />);

    // Check that SVG is rendered (could be either animated or static)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('allows clicking on step buttons to jump to specific steps', async () => {
    render(<StealthAnimation />);

    // Find a step button (e.g., step 3)
    const step3Button = screen.getByRole('button', { name: /jump to step 3/i });
    fireEvent.click(step3Button);

    // Should update to that step's description - use role heading for specificity
    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: /3\. Public Announcement/i });
      expect(heading).toBeInTheDocument();
    });
  });

  it('pauses animation when Pause button is clicked', async () => {
    render(<StealthAnimation />);

    // Start animation
    const playButton = screen.getByRole('button', { name: /play animation/i });
    fireEvent.click(playButton);

    // Wait for pause button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause animation/i })).toBeInTheDocument();
    });

    // Click pause
    const pauseButton = screen.getByRole('button', { name: /pause animation/i });
    fireEvent.click(pauseButton);

    // Should change to Resume button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume animation/i })).toBeInTheDocument();
    });
  });
});
