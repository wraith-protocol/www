/**
 * StellarDeploymentTable
 *
 * Displays the testnet contract addresses for the Wraith Stellar deployment.
 *
 * Import boundary: this component intentionally imports from
 * src/data/stellarDeployment.ts (plain static constants) rather than directly
 * from @wraith-protocol/sdk/chains/stellar. That keeps @stellar/stellar-sdk
 * out of this chunk's preload graph — the ~900 kB vendor-stellar-sdk chunk is
 * only fetched by components that actually need live Soroban RPC calls
 * (i.e. StellarMetrics via stellarMetrics.ts).
 */
import { STELLAR_CONTRACTS, STELLAR_EXPLORER_BASE } from '../data/stellarDeployment';
import { trackOutbound } from '../utils/track';
import { useInView } from '../hooks/useInView';

const contracts = [
  {
    name: 'Announcement Registry',
    address: STELLAR_CONTRACTS.announcer,
    explorer: `${STELLAR_EXPLORER_BASE}${STELLAR_CONTRACTS.announcer}`,
  },
  {
    name: 'Names Registry',
    address: STELLAR_CONTRACTS.names,
    explorer: `${STELLAR_EXPLORER_BASE}${STELLAR_CONTRACTS.names}`,
  },
];

export default function StellarDeploymentTable() {
  const { ref: tableRef, isInView: tableInView } = useInView({ threshold: 0.1 });

  return (
    <section ref={tableRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto max-w-336 flex flex-col gap-8" data-reveal={tableInView}>
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Deployments
          </span>
          <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
            Testnet contracts
          </h2>
        </div>

        <div className="border border-outline-variant overflow-x-auto">
          <table
            className="w-full border-collapse font-body text-[13px]"
            aria-label="Testnet contract addresses"
          >
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container">
                <th
                  scope="col"
                  className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase"
                >
                  Contract
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase"
                >
                  Address
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase"
                >
                  Explorer
                </th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, i) => (
                <tr
                  key={c.name}
                  className={i < contracts.length - 1 ? 'border-b border-outline-variant' : ''}
                >
                  <td className="py-3 px-4 font-heading text-[13px] font-medium text-on-surface whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-on-surface-variant break-all">
                    {c.address}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <a
                      href={c.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={trackOutbound('explorer')}
                      aria-label={`View ${c.name} on explorer (opens in new tab)`}
                      className="font-mono text-[11px] font-semibold tracking-[1px] text-tertiary hover:brightness-110 transition-[filter]"
                    >
                      View ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="font-mono text-[10px] tracking-[1px] text-outline">
          Addresses are sourced from the SDK&apos;s canonical Stellar testnet deployment registry.
        </p>
      </div>
    </section>
  );
}
