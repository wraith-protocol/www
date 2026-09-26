import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('Threat model page', () => {
  it('renders the threat model page for the /threat-model route', async () => {
    window.history.replaceState({}, '', '/threat-model');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /threat model/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /threat model matrix/i })).toBeInTheDocument();
  });
});
