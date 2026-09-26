import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CALCULATOR_CHAINS, type CalculatorChain } from '../data/calculatorChains';
import { copyToClipboard } from '../utils/clipboard';
import { track } from '../utils/track';

export type CostChain = CalculatorChain;

/**
 * Modelled client/gateway work for one stealth-payment scenario.
 * This is deliberately isolated from network fees: it is a calculator
 * assumption, not an on-chain Wraith protocol fee, and can be revised without
 * changing the calculation or URL-state model.
 */
export const STEALTH_OVERHEAD_USD_PER_PAYMENT = 0.001;

export const DEFAULT_PAYMENTS = 1000;
export const DEFAULT_AVERAGE_PAYMENT = 100;
export const MIN_PAYMENTS = 1;
export const MIN_AVERAGE_PAYMENT = 0.01;
export const MAX_PAYMENTS = 1_000_000;
export const MAX_AVERAGE_PAYMENT = 100_000_000;

export type CostScenario = {
  chainId: string;
  paymentsPerMonth: number;
  averagePaymentUsd: number;
};

function firstChain(chains: readonly CostChain[]) {
  const chain = chains[0];
  if (!chain) throw new Error('CostCalculator requires at least one chain');
  return chain;
}

function boundedNumber(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
}

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = boundedNumber(value, fallback, min, max);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function scenarioFromSearchParams(
  params: URLSearchParams,
  chains: readonly CostChain[],
): CostScenario {
  const fallbackChain = firstChain(chains);
  const requestedChain = params.get('chain');
  const selectedChain = chains.find((chain) => chain.id === requestedChain) ?? fallbackChain;

  return {
    chainId: selectedChain.id,
    paymentsPerMonth: boundedInteger(
      params.get('payments'),
      DEFAULT_PAYMENTS,
      MIN_PAYMENTS,
      MAX_PAYMENTS,
    ),
    averagePaymentUsd: boundedNumber(
      params.get('avg'),
      DEFAULT_AVERAGE_PAYMENT,
      MIN_AVERAGE_PAYMENT,
      MAX_AVERAGE_PAYMENT,
    ),
  };
}

export function scenarioToSearchParams(scenario: CostScenario) {
  return new URLSearchParams({
    chain: scenario.chainId,
    payments: String(scenario.paymentsPerMonth),
    avg: String(scenario.averagePaymentUsd),
  });
}

export function calculateCost(
  networkFeeUsd: number,
  paymentsPerMonth: number,
  averagePaymentUsd: number,
) {
  const networkFees = networkFeeUsd * paymentsPerMonth;
  const stealthOverhead = STEALTH_OVERHEAD_USD_PER_PAYMENT * paymentsPerMonth;
  const monthlyTotal = networkFees + stealthOverhead;
  const monthlyVolume = paymentsPerMonth * averagePaymentUsd;

  return {
    networkFees,
    stealthOverhead,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    monthlyVolume,
    effectiveCostPerPayment: paymentsPerMonth > 0 ? monthlyTotal / paymentsPerMonth : 0,
    costShare: monthlyVolume > 0 ? (monthlyTotal / monthlyVolume) * 100 : 0,
  };
}

function formatUsd(value: number, locale: string) {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
  });
}

type Props = {
  chains?: readonly CostChain[];
};

export default function CostCalculator({ chains = CALCULATOR_CHAINS }: Props) {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const fallbackChain = useMemo(() => firstChain(chains), [chains]);
  const scenario = useMemo(
    () => scenarioFromSearchParams(searchParams, chains),
    [chains, searchParams],
  );
  const selectedChain = chains.find((chain) => chain.id === scenario.chainId) ?? fallbackChain;

  const [paymentsInput, setPaymentsInput] = useState(String(scenario.paymentsPerMonth));
  const [averageInput, setAverageInput] = useState(String(scenario.averagePaymentUsd));
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    setPaymentsInput(String(scenario.paymentsPerMonth));
    setAverageInput(String(scenario.averagePaymentUsd));
  }, [scenario.chainId, scenario.paymentsPerMonth, scenario.averagePaymentUsd]);

  const totals = useMemo(
    () =>
      calculateCost(
        selectedChain.networkFeeUsd,
        scenario.paymentsPerMonth,
        scenario.averagePaymentUsd,
      ),
    [selectedChain.networkFeeUsd, scenario.paymentsPerMonth, scenario.averagePaymentUsd],
  );

  const updateScenario = (updates: Partial<CostScenario>) => {
    setSearchParams(scenarioToSearchParams({ ...scenario, ...updates }), { replace: true });
    setShareStatus('idle');
  };

  const updateNumericScenario = (
    key: 'paymentsPerMonth' | 'averagePaymentUsd',
    raw: string,
    min: number,
    max: number,
    integerOnly = false,
  ) => {
    const parsed = Number(raw);
    if (
      raw.trim() === '' ||
      !Number.isFinite(parsed) ||
      parsed < min ||
      parsed > max ||
      (integerOnly && !Number.isInteger(parsed))
    ) {
      return;
    }
    updateScenario({ [key]: parsed });
  };

  const resetScenario = () => {
    updateScenario({
      chainId: fallbackChain.id,
      paymentsPerMonth: DEFAULT_PAYMENTS,
      averagePaymentUsd: DEFAULT_AVERAGE_PAYMENT,
    });
  };

  const copyScenarioLink = async () => {
    const path = `/use-cases/calculator?${scenarioToSearchParams(scenario).toString()}`;
    const url = typeof window === 'undefined' ? path : new URL(path, window.location.origin).href;

    try {
      await copyToClipboard(url);
      track('calculator_share', { source: 'cost-calculator' });
      setShareStatus('copied');
    } catch {
      setShareStatus('failed');
    }
  };

  return (
    <section
      aria-labelledby="cost-calculator-heading"
      className="border-y border-outline-variant-30 px-6 py-20 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('costCalculator.eyebrow', { defaultValue: 'Cost estimator' })}
          </span>
          <h2
            id="cost-calculator-heading"
            className="mt-3 font-heading text-3xl font-bold tracking-tight md:text-4xl"
          >
            {t('costCalculator.heading', {
              defaultValue: 'Estimate the cost of private payments',
            })}
          </h2>
          <p className="mt-4 text-base leading-7 text-outline">
            {t('costCalculator.description', {
              defaultValue:
                'Model a monthly payment scenario, compare network fees with a documented stealth-generation overhead assumption, and share the exact scenario from the URL.',
            })}
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <fieldset className="border border-outline-variant-30 bg-surface-dim p-6 md:p-8">
            <legend className="px-2 font-heading text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
              {t('costCalculator.scenario', { defaultValue: 'Scenario' })}
            </legend>

            <div className="space-y-6">
              <div>
                <label htmlFor="cost-chain" className="mb-2 block text-sm font-semibold">
                  {t('costCalculator.chain', { defaultValue: 'Chain' })}
                </label>
                <select
                  id="cost-chain"
                  value={selectedChain.id}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateScenario({ chainId: event.target.value })
                  }
                  className="h-11 w-full border border-outline bg-surface px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {chains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cost-payments" className="mb-2 block text-sm font-semibold">
                  {t('costCalculator.paymentsPerMonth', {
                    defaultValue: 'Payments per month',
                  })}
                </label>
                <input
                  id="cost-payments"
                  type="number"
                  min={MIN_PAYMENTS}
                  max={MAX_PAYMENTS}
                  step="1"
                  inputMode="numeric"
                  value={paymentsInput}
                  aria-describedby="cost-payments-hint"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setPaymentsInput(event.target.value);
                    updateNumericScenario(
                      'paymentsPerMonth',
                      event.target.value,
                      MIN_PAYMENTS,
                      MAX_PAYMENTS,
                      true,
                    );
                  }}
                  onBlur={() => setPaymentsInput(String(scenario.paymentsPerMonth))}
                  className="h-11 w-full border border-outline bg-surface px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <p id="cost-payments-hint" className="mt-2 text-xs text-outline">
                  {t('costCalculator.paymentsHint', {
                    defaultValue: '1 to {{max}} payments.',
                    max: MAX_PAYMENTS.toLocaleString(locale),
                  })}
                </p>
              </div>

              <div>
                <label htmlFor="cost-average" className="mb-2 block text-sm font-semibold">
                  {t('costCalculator.averagePayment', {
                    defaultValue: 'Average payment value (USD)',
                  })}
                </label>
                <input
                  id="cost-average"
                  type="number"
                  min={MIN_AVERAGE_PAYMENT}
                  max={MAX_AVERAGE_PAYMENT}
                  step="0.01"
                  inputMode="decimal"
                  value={averageInput}
                  aria-describedby="cost-average-hint"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setAverageInput(event.target.value);
                    updateNumericScenario(
                      'averagePaymentUsd',
                      event.target.value,
                      MIN_AVERAGE_PAYMENT,
                      MAX_AVERAGE_PAYMENT,
                    );
                  }}
                  onBlur={() => setAverageInput(String(scenario.averagePaymentUsd))}
                  className="h-11 w-full border border-outline bg-surface px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <p id="cost-average-hint" className="mt-2 text-xs text-outline">
                  {t('costCalculator.averageHint', {
                    defaultValue:
                      'Used for payment-volume context; it does not change the network fee estimate.',
                  })}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-outline-variant-30 pt-6">
                <button
                  type="button"
                  onClick={copyScenarioLink}
                  className="inline-flex h-10 items-center justify-center bg-primary px-4 font-heading text-xs font-semibold uppercase tracking-wider text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t('costCalculator.copy', { defaultValue: 'Copy scenario link' })}
                </button>
                <button
                  type="button"
                  onClick={resetScenario}
                  className="inline-flex h-10 items-center justify-center border border-outline px-4 font-heading text-xs font-semibold uppercase tracking-wider focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t('costCalculator.reset', { defaultValue: 'Reset' })}
                </button>
                <span className="self-center text-xs text-outline" role="status" aria-live="polite">
                  {shareStatus === 'copied'
                    ? t('costCalculator.copySuccess', {
                        defaultValue: 'Scenario link copied.',
                      })
                    : shareStatus === 'failed'
                      ? t('costCalculator.copyFailure', {
                          defaultValue:
                            'Could not copy automatically. The URL still contains this scenario.',
                        })
                      : ''}
                </span>
              </div>
            </div>
          </fieldset>

          <div className="border border-outline-variant-30 bg-surface-container p-6 md:p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-outline">
                  {t('costCalculator.networkFees', { defaultValue: 'Estimated network fees' })}
                </p>
                <p className="mt-2 break-words font-heading text-3xl font-bold">
                  {formatUsd(totals.networkFees, locale)}
                </p>
                <p className="mt-2 text-xs leading-5 text-outline">
                  {t('costCalculator.perPayment', {
                    defaultValue: '{{fee}} per payment',
                    fee: formatUsd(selectedChain.networkFeeUsd, locale),
                  })}{' '}
                  · {selectedChain.sourceLabel} ·{' '}
                  <a
                    href={selectedChain.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-on-surface"
                  >
                    {t('costCalculator.feeSource', { defaultValue: 'fee source' })}
                  </a>
                </p>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-outline">
                  {t('costCalculator.stealthOverhead', {
                    defaultValue: 'Modelled stealth generation overhead',
                  })}
                </p>
                <p className="mt-2 break-words font-heading text-3xl font-bold">
                  {formatUsd(totals.stealthOverhead, locale)}
                </p>
                <p className="mt-2 text-xs leading-5 text-outline">
                  {t('costCalculator.overheadNote', {
                    defaultValue:
                      '{{fee}} per payment · documented calculator assumption, not an on-chain protocol fee',
                    fee: formatUsd(STEALTH_OVERHEAD_USD_PER_PAYMENT, locale),
                  })}
                </p>
              </div>
            </div>

            <div
              aria-live="polite"
              aria-atomic="true"
              className="mt-8 border-t border-outline-variant-30 pt-8"
            >
              <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-outline">
                {t('costCalculator.monthlyTotal', { defaultValue: 'Estimated monthly total' })}
              </p>
              <p className="mt-2 break-words font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                {formatUsd(totals.monthlyTotal, locale)}
              </p>
              <p className="mt-3 text-sm text-outline">
                {t('costCalculator.monthlyContext', {
                  defaultValue:
                    'Across {{payments}} payments and {{volume}} in monthly payment volume.',
                  payments: scenario.paymentsPerMonth.toLocaleString(locale),
                  volume: formatUsd(totals.monthlyVolume, locale),
                })}
              </p>
            </div>

            <dl className="mt-8 grid gap-5 border-t border-outline-variant-30 pt-8 sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[1.5px] text-outline">
                  {t('costCalculator.effectiveCost', {
                    defaultValue: 'Effective cost / payment',
                  })}
                </dt>
                <dd className="mt-2 font-heading text-xl font-semibold">
                  {formatUsd(totals.effectiveCostPerPayment, locale)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[1.5px] text-outline">
                  {t('costCalculator.feeLoad', {
                    defaultValue: 'Fee load vs payment volume',
                  })}
                </dt>
                <dd className="mt-2 font-heading text-xl font-semibold">
                  {totals.costShare.toFixed(4)}%
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[1.5px] text-outline">
                  {t('costCalculator.annualEstimate', { defaultValue: '12-month estimate' })}
                </dt>
                <dd className="mt-2 font-heading text-xl font-semibold">
                  {formatUsd(totals.annualTotal, locale)}
                </dd>
              </div>
            </dl>

            <p className="mt-8 border-t border-outline-variant-30 pt-6 text-xs leading-5 text-outline">
              {t('costCalculator.disclaimer', {
                defaultValue:
                  'Estimates are directional. Network fees can change with chain conditions; source notes identify the planning constants used by this calculator. Canonical chain data will replace the temporary adapter when #127 lands.',
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
