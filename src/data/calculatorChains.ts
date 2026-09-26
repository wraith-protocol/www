export type CalculatorChain = {
  id: string;
  name: string;
  networkFeeUsd: number;
  sourceLabel: string;
  sourceUrl: string;
};

/**
 * Temporary fee-data boundary for issue #128 while issue #127 owns the
 * canonical `src/data/chains.json` schema.
 *
 * These values are planning baselines, not canonical Wraith fee data. The
 * linked protocol documentation explains the underlying fee mechanics. Once
 * #127 lands, replace this array with a narrow adapter over `chains.json`
 * without changing calculator logic.
 */
export const CALCULATOR_CHAINS: readonly CalculatorChain[] = [
  {
    id: 'stellar',
    name: 'Stellar',
    networkFeeUsd: 0.0001,
    sourceLabel: 'temporary planning baseline pending #127',
    sourceUrl:
      'https://developers.stellar.org/docs/build/guides/transactions/send-and-receive-payments',
  },
  {
    id: 'solana',
    name: 'Solana',
    networkFeeUsd: 0.001,
    sourceLabel: 'temporary planning baseline pending #127',
    sourceUrl: 'https://solana.com/docs/core/fees',
  },
  {
    id: 'nervos-ckb',
    name: 'Nervos CKB',
    networkFeeUsd: 0.0005,
    sourceLabel: 'temporary planning baseline pending #127',
    sourceUrl: 'https://docs.nervos.org/docs/tech-explanation/glossary',
  },
  {
    id: 'horizen',
    name: 'Horizen',
    networkFeeUsd: 0.005,
    sourceLabel: 'temporary planning baseline; execution/data fees vary',
    sourceUrl: 'https://docs.horizen.io/horizen-chain/tokens-and-gas/gas-on-horizen/',
  },
];
