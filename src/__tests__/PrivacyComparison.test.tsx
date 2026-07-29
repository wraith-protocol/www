import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrivacyComparison from '../components/PrivacyComparison';

describe('PrivacyComparison', () => {
  it('renders both transaction types', () => {
    render(<PrivacyComparison />);

    expect(screen.getByText('Normal Stellar Payment')).toBeInTheDocument();
    expect(screen.getByText('Wraith Stealth Transaction')).toBeInTheDocument();
  });

  it('shows correct visibility counts', () => {
    render(<PrivacyComparison />);

    expect(screen.getByText('7 of 7 fields publicly visible')).toBeInTheDocument();
    expect(screen.getByText('2 of 7 fields publicly visible')).toBeInTheDocument();
  });

  it('renders all data fields with proper labels', () => {
    render(<PrivacyComparison />);

    // Should render each field twice (once for normal, once for wraith)
    const senderFields = screen.getAllByText('Sender');
    const recipientFields = screen.getAllByText('Recipient');
    const amountFields = screen.getAllByText('Amount');

    expect(senderFields).toHaveLength(2);
    expect(recipientFields).toHaveLength(2);
    expect(amountFields).toHaveLength(2);
  });

  it('has keyboard accessible fields', () => {
    render(<PrivacyComparison />);

    // All data fields should be focusable (role="button" with tabIndex={0})
    const focusableElements = screen.getAllByRole('button');

    // 7 fields × 2 transaction types = 14 focusable elements
    expect(focusableElements).toHaveLength(14);
  });

  it('includes proper ARIA labels for accessibility', () => {
    render(<PrivacyComparison />);

    // Check that fields have descriptive aria-labels
    const publicField = screen.getByLabelText(/sender.*publicly visible/i);
    const privateField = screen.getByLabelText(/sender.*private/i);

    expect(publicField).toBeInTheDocument();
    expect(privateField).toBeInTheDocument();
  });

  it('renders legend explaining color coding', () => {
    render(<PrivacyComparison />);

    expect(screen.getByText('Public Data')).toBeInTheDocument();
    expect(screen.getByText('Private Data')).toBeInTheDocument();
  });

  it('shows hover hint on larger screens', () => {
    render(<PrivacyComparison />);

    expect(screen.getByText('Hover over fields to highlight')).toBeInTheDocument();
  });
});
