import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import CostCalculator, {
  DEFAULT_AVERAGE_PAYMENT,
  DEFAULT_PAYMENTS,
  MAX_AVERAGE_PAYMENT,
  MAX_PAYMENTS,
  calculateCost,
  scenarioFromSearchParams,
  scenarioToSearchParams,
  type CostChain,
} from '../components/CostCalculator';

const chains: CostChain[] = [
  {
    id: 'alpha',
    name: 'Alpha',
    networkFeeUsd: 0.01,
    sourceLabel: 'Test source',
    sourceUrl: 'https://example.com/alpha-fee',
  },
  {
    id: 'beta',
    name: 'Beta',
    networkFeeUsd: 0.02,
    sourceLabel: 'Test source',
    sourceUrl: 'https://example.com/beta-fee',
  },
];

beforeEach(async () => {
  delete window.plausible;
  await i18n.changeLanguage('en');
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderCalculator(initialEntry = '/use-cases/calculator') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CostCalculator chains={chains} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('CostCalculator', () => {
  it('renders the default scenario and calculations', () => {
    renderCalculator();

    expect(screen.getByLabelText('Chain')).toHaveValue('alpha');
    expect(screen.getByLabelText('Payments per month')).toHaveValue(DEFAULT_PAYMENTS);
    expect(screen.getByLabelText('Average payment value (USD)')).toHaveValue(
      DEFAULT_AVERAGE_PAYMENT,
    );
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('$1.00')).toBeInTheDocument();
    expect(screen.getByText('$11.00')).toBeInTheDocument();
  });

  it('reconstructs a shared scenario from URL query params', () => {
    renderCalculator('/use-cases/calculator?chain=beta&payments=250&avg=80');

    expect(screen.getByLabelText('Chain')).toHaveValue('beta');
    expect(screen.getByLabelText('Payments per month')).toHaveValue(250);
    expect(screen.getByLabelText('Average payment value (USD)')).toHaveValue(80);
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('$0.25')).toBeInTheDocument();
    expect(screen.getByText('$5.25')).toBeInTheDocument();
  });

  it('writes scenario changes back to the URL', () => {
    renderCalculator();

    fireEvent.change(screen.getByLabelText('Chain'), { target: { value: 'beta' } });
    fireEvent.change(screen.getByLabelText('Payments per month'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Average payment value (USD)'), {
      target: { value: '40' },
    });

    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).toContain('chain=beta');
    expect(search).toContain('payments=500');
    expect(search).toContain('avg=40');
  });

  it('shows inline source notes and the overhead assumption', () => {
    renderCalculator();

    expect(screen.getByText(/Test source/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'fee source' })).toHaveAttribute(
      'href',
      'https://example.com/alpha-fee',
    );
    expect(screen.getByText(/documented calculator assumption/)).toBeInTheDocument();
  });

  it('rejects malformed and out-of-range shared state safely', () => {
    const invalid = scenarioFromSearchParams(
      new URLSearchParams('chain=missing&payments=-5&avg=not-a-number'),
      chains,
    );
    expect(invalid).toEqual({
      chainId: 'alpha',
      paymentsPerMonth: DEFAULT_PAYMENTS,
      averagePaymentUsd: DEFAULT_AVERAGE_PAYMENT,
    });

    const capped = scenarioFromSearchParams(
      new URLSearchParams('chain=alpha&payments=999999999&avg=9999999999'),
      chains,
    );
    expect(capped.paymentsPerMonth).toBe(MAX_PAYMENTS);
    expect(capped.averagePaymentUsd).toBe(MAX_AVERAGE_PAYMENT);
  });

  it('does not commit fractional payment counts', () => {
    renderCalculator('/use-cases/calculator?chain=alpha&payments=10&avg=25');

    const payments = screen.getByLabelText('Payments per month');
    fireEvent.change(payments, { target: { value: '1.5' } });

    expect(screen.getByTestId('location-search')).toHaveTextContent('payments=10');
    fireEvent.blur(payments);
    expect(payments).toHaveValue(10);
  });

  it('resynchronizes an invalid draft when another scenario field changes', () => {
    renderCalculator('/use-cases/calculator?chain=alpha&payments=10&avg=25');

    const payments = screen.getByLabelText('Payments per month');
    fireEvent.change(payments, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Chain'), { target: { value: 'beta' } });

    expect(payments).toHaveValue(10);
    expect(screen.getByTestId('location-search')).toHaveTextContent('chain=beta');
    expect(screen.getByTestId('location-search')).toHaveTextContent('payments=10');
  });

  it('resets to canonical defaults', () => {
    renderCalculator('/use-cases/calculator?chain=beta&payments=250&avg=80');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByLabelText('Chain')).toHaveValue('alpha');
    expect(screen.getByLabelText('Payments per month')).toHaveValue(1000);
    expect(screen.getByLabelText('Average payment value (USD)')).toHaveValue(100);
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?chain=alpha&payments=1000&avg=100',
    );
  });

  it('copies a canonical standalone scenario URL and surfaces fallback failure', async () => {
    const plausible = vi.fn();
    window.plausible = plausible;
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    renderCalculator('/use-cases/calculator?chain=beta&payments=250&avg=80');
    const copy = screen.getByRole('button', { name: 'Copy scenario link' });

    fireEvent.click(copy);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/use-cases/calculator?chain=beta&payments=250&avg=80'),
    );
    expect(await screen.findByText('Scenario link copied.')).toBeInTheDocument();
    expect(plausible).toHaveBeenCalledWith('calculator_share', {
      props: { source: 'cost-calculator' },
    });

    fireEvent.click(copy);
    expect(
      await screen.findByText(
        'Could not copy automatically. The URL still contains this scenario.',
      ),
    ).toBeInTheDocument();
  });

  it('serializes deterministically and calculates floating-point metrics safely', () => {
    const params = scenarioToSearchParams({
      chainId: 'beta',
      paymentsPerMonth: 250,
      averagePaymentUsd: 80,
    });
    expect(params.toString()).toBe('chain=beta&payments=250&avg=80');

    const result = calculateCost(0.01, 1000, 100);
    expect(result.monthlyTotal).toBe(11);
    expect(result.annualTotal).toBe(132);
    expect(result.effectiveCostPerPayment).toBeCloseTo(0.011, 10);
    expect(result.costShare).toBeCloseTo(0.011, 10);
  });
});
