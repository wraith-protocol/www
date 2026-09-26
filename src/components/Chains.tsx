import { useTranslation } from 'react-i18next';
import { useInView } from '../hooks/useInView';
import { Link } from 'react-router-dom';

export default function Chains() {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const chains = [
    {
      name: 'Horizen',
      active: true,
      status: t('chains.statuses.liveTestnet'),
      meta: t('chains.horizen.meta'),
      border: true,
    },
    {
      name: 'Stellar',
      active: true,
      status: t('chains.statuses.liveTestnet'),
      meta: t('chains.stellar.meta'),
      featured: true,
      border: true,
    },
    {
      name: 'Solana',
      active: true,
      status: t('chains.statuses.liveDevnet'),
      meta: t('chains.solana.meta'),
      border: true,
    },
    {
      name: 'Nervos CKB',
      active: true,
      status: t('chains.statuses.liveTestnet'),
      meta: t('chains.ckb.meta'),
      border: false,
    },
  ];

  return (
    <section ref={ref} className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-336 flex-col gap-10">
        <div className="flex flex-col gap-3" data-reveal={isInView}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('chains.eyebrow')}
          </span>
          <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
            {t('chains.heading')}
          </h2>
        </div>

        <div
          className="rounded-sm border border-tertiary bg-surface-container p-5"
          data-reveal={isInView}
        >
          <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-tertiary">
            {t('chains.stellarNote.eyebrow')}
          </span>
          <p className="font-body text-sm leading-[1.6] text-on-surface-variant">
            {t('chains.stellarNote.description')}
          </p>
        </div>

        <div className="grid grid-cols-2 border-y border-outline-variant md:grid-cols-4">
          {chains.map((chain, index) => (
            <div
              key={chain.name}
              className={`flex flex-col gap-4 p-6 md:p-7 ${chain.border ? 'border-b border-outline-variant md:border-r md:border-b-0' : ''} ${chain.featured ? 'bg-surface-bright' : ''}`}
              data-reveal={isInView}
              style={{ transitionDelay: isInView ? `${index * 80}ms` : '0ms' }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`font-heading text-lg font-semibold ${chain.active ? 'text-on-surface' : 'text-outline'}`}
                >
                  {chain.name}
                </span>
                {chain.featured && (
                  <span className="rounded-full border border-tertiary px-2 py-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-tertiary">
                    {t('chains.partner')}
                  </span>
                )}
                {chain.name === 'Stellar' && (
                  <Link
                    to="/stellar"
                    className="mt-1 inline-block text-sm font-medium text-tertiary hover:underline"
                  >
                    Learn More →
                  </Link>
                )}
              </div>
              <span
                className={`font-mono text-[10px] font-semibold tracking-[1.5px] ${chain.active ? 'text-tertiary' : 'text-outline'}`}
              >
                {chain.status}
              </span>
              <span
                className={`font-mono text-[11px] ${chain.active ? 'text-outline' : 'text-on-surface-variant'}`}
              >
                {chain.meta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
