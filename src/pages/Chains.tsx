import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import chainsData from '../data/chains.json';
import { track } from '../utils/track';

type SortDirection = 'asc' | 'desc';

interface SortState {
  key: string;
  direction: SortDirection;
}

const STATUS_COLORS: Record<string, string> = {
  live: 'text-[#22c55e] bg-[#22c55e]/10',
  testnet: 'text-primary bg-surface-bright',
  devnet: 'text-primary bg-surface-bright',
  planned: 'text-outline bg-surface-bright',
};

const STATUS_LABELS: Record<string, string> = {
  live: 'Live',
  testnet: 'Testnet',
  devnet: 'Devnet',
  planned: 'Planned',
};

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (!direction) return null;
  return (
    <span className="ml-1 inline-block text-[10px] text-outline">
      {direction === 'asc' ? '\u25B2' : '\u25BC'}
    </span>
  );
}

export default function Chains() {
  const [sort, setSort] = useState<SortState | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredChains = useMemo(() => {
    let chains = [...chainsData.chains];
    if (filter !== 'all') {
      chains = chains.filter((c) => c.status === filter);
    }
    if (sort) {
      chains.sort((a, b) => {
        const aVal = a[sort.key as keyof typeof a];
        const bVal = b[sort.key as keyof typeof b];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }
    return chains;
  }, [sort, filter]);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
    track('chain_matrix_sort', {
      column: key,
      direction: sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <Helmet>
        <title>Chain Comparison Matrix — Wraith Protocol</title>
        <meta
          name="description"
          content="Compare blockchain networks supported by Wraith Protocol: block times, fees, finality, wallet support, and integration status."
        />
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 lg:px-10">
        <header className="mb-10 border-b border-outline-variant pb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
            {chainsData.title}
          </h1>
          <p className="mt-4 max-w-3xl font-body text-base leading-relaxed text-on-surface-variant">
            {chainsData.description}
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'live', 'testnet', 'devnet', 'planned'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`border px-4 py-2 font-mono text-[11px] uppercase tracking-[1.5px] transition-colors ${
                filter === status
                  ? 'border-on-surface bg-surface-bright text-on-surface'
                  : 'border-outline-variant bg-surface-container text-outline hover:border-outline hover:text-on-surface'
              }`}
            >
              {status === 'all' ? 'All Chains' : STATUS_LABELS[status] || status}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto pb-4">
          <table
            aria-label={chainsData.title}
            className="min-w-[900px] border-collapse border border-outline-variant bg-surface-container"
          >
            <thead>
              <tr>
                {chainsData.columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`border border-outline-variant bg-surface-bright px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[2px] text-outline ${
                      col.sortable ? 'cursor-pointer select-none hover:text-on-surface' : ''
                    }`}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {col.sortable && sort?.key === col.key && (
                        <SortIcon direction={sort.direction} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredChains.map((chain) => (
                <>
                  <tr
                    key={chain.id}
                    className="cursor-pointer transition-colors hover:bg-surface-bright"
                    onClick={() => toggleRow(chain.id)}
                  >
                    <td className="border border-outline-variant px-4 py-4">
                      <span className="font-heading text-lg font-semibold text-on-surface">
                        {chain.name}
                      </span>
                    </td>
                    <td className="border border-outline-variant px-4 py-4">
                      <span className="font-mono text-sm text-on-surface">{chain.blockTime}s</span>
                    </td>
                    <td className="border border-outline-variant px-4 py-4">
                      <span className="font-mono text-sm text-on-surface">
                        ${chain.medianFee.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                      </span>
                    </td>
                    <td className="border border-outline-variant px-4 py-4">
                      <span className="font-body text-sm text-on-surface-variant">
                        {chain.finality}
                      </span>
                    </td>
                    <td className="border border-outline-variant px-4 py-4">
                      <span className="font-body text-sm text-on-surface-variant">
                        {chain.wallets}
                      </span>
                    </td>
                    <td className="border border-outline-variant px-4 py-4">
                      <span
                        className={`inline-block px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] ${STATUS_COLORS[chain.status] || ''}`}
                      >
                        {STATUS_LABELS[chain.status] || chain.status}
                      </span>
                    </td>
                    <td className="border border-outline-variant px-4 py-4">
                      <span className="font-body text-sm text-on-surface-variant">
                        {chain.audit}
                      </span>
                    </td>
                    <td className="border border-outline-variant px-4 py-4">
                      <a
                        href={chain.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-sm text-primary transition-colors hover:text-primary-variant"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Docs
                      </a>
                    </td>
                  </tr>
                  {expandedRow === chain.id && (
                    <tr key={`${chain.id}-detail`}>
                      <td
                        colSpan={chainsData.columns.length}
                        className="border border-outline-variant border-t-0 bg-surface-bright px-6 py-5"
                      >
                        <p className="max-w-3xl font-body text-sm leading-relaxed text-on-surface-variant">
                          {chain.description}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filteredChains.length === 0 && (
                <tr>
                  <td
                    colSpan={chainsData.columns.length}
                    className="border border-outline-variant px-6 py-12 text-center font-body text-sm text-outline"
                  >
                    No chains match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded border border-outline-variant bg-surface-container p-5">
          <h2 className="font-heading text-xl font-semibold text-on-surface">Data Sources</h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-on-surface-variant">
            Block times, fees, and finality data are sourced from each chain&apos;s public
            documentation and block explorers. Fee values represent approximate median USD cost at
            time of writing and may vary with network congestion. Audit posture reflects the latest
            publicly available information from each project.
          </p>
        </div>

        <div className="mt-6 border-t border-outline-variant pt-6">
          <p className="font-body text-sm leading-relaxed text-on-surface-variant">
            Looking to integrate? Check the{' '}
            <a
              href="https://docs.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-outline-variant/40 underline-offset-4 hover:text-on-surface"
            >
              SDK documentation
            </a>{' '}
            for getting started guides per chain.
          </p>
        </div>
      </div>
    </>
  );
}
