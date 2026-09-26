import { type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

const comparisonTabs = ['all', 'wraith', 'mixers', 'rollups', 'railgun', 'transparent'] as const;
type ComparisonTab = (typeof comparisonTabs)[number];

type ComparisonRow = {
  protocol: string;
  isWraith?: boolean;
  mechanism: string;
  ux: string;
  recipient: string;
  regulation: string;
  multichain: string;
  complexity: string;
};

export default function Compare() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ComparisonTab>('all');

  const comparisonData: ComparisonRow[] = [
    {
      protocol: t('compare.rows.wraith.name'),
      isWraith: true,
      mechanism: t('compare.rows.wraith.mechanism'),
      ux: t('compare.rows.wraith.ux'),
      recipient: t('compare.rows.wraith.recipient'),
      regulation: t('compare.rows.wraith.regulation'),
      multichain: t('compare.rows.wraith.multichain'),
      complexity: t('compare.rows.wraith.complexity'),
    },
    {
      protocol: t('compare.rows.tornado.name'),
      mechanism: t('compare.rows.tornado.mechanism'),
      ux: t('compare.rows.tornado.ux'),
      recipient: t('compare.rows.tornado.recipient'),
      regulation: t('compare.rows.tornado.regulation'),
      multichain: t('compare.rows.tornado.multichain'),
      complexity: t('compare.rows.tornado.complexity'),
    },
    {
      protocol: t('compare.rows.aztec.name'),
      mechanism: t('compare.rows.aztec.mechanism'),
      ux: t('compare.rows.aztec.ux'),
      recipient: t('compare.rows.aztec.recipient'),
      regulation: t('compare.rows.aztec.regulation'),
      multichain: t('compare.rows.aztec.multichain'),
      complexity: t('compare.rows.aztec.complexity'),
    },
    {
      protocol: t('compare.rows.railgun.name'),
      mechanism: t('compare.rows.railgun.mechanism'),
      ux: t('compare.rows.railgun.ux'),
      recipient: t('compare.rows.railgun.recipient'),
      regulation: t('compare.rows.railgun.regulation'),
      multichain: t('compare.rows.railgun.multichain'),
      complexity: t('compare.rows.railgun.complexity'),
    },
    {
      protocol: t('compare.rows.statusQuo.name'),
      mechanism: t('compare.rows.statusQuo.mechanism'),
      ux: t('compare.rows.statusQuo.ux'),
      recipient: t('compare.rows.statusQuo.recipient'),
      regulation: t('compare.rows.statusQuo.regulation'),
      multichain: t('compare.rows.statusQuo.multichain'),
      complexity: t('compare.rows.statusQuo.complexity'),
    },
  ];

  const activeTabIndex = comparisonTabs.indexOf(activeTab);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = activeTabIndex;

    if (event.key === 'ArrowRight') nextIndex = (activeTabIndex + 1) % comparisonTabs.length;
    else if (event.key === 'ArrowLeft') {
      nextIndex = (activeTabIndex - 1 + comparisonTabs.length) % comparisonTabs.length;
    } else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = comparisonTabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = comparisonTabs[nextIndex];
    if (!nextTab) return;

    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      document.getElementById(`comparison-tab-${nextTab}`)?.focus();
    });
  };

  return (
    <section
      id="compare"
      className="border-t border-outline-variant-30 px-6 py-24 md:px-12 scroll-mt-20"
    >
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('compare.eyebrow')}
          </span>
          <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
            {t('compare.heading')}
          </h2>
          <p className="font-body text-base leading-[1.6] text-on-surface-variant max-w-2xl">
            {t('compare.description')}
          </p>
        </div>

        <div className="flex items-center justify-between lg:hidden">
          <span className="font-mono text-[10px] text-outline flex items-center gap-1.5">
            <span>{t('compare.scrollHint')}</span>
            <span className="animate-pulse">→</span>
          </span>
        </div>

        <div className="relative border border-outline-variant bg-surface-container overflow-hidden rounded-sm">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-container to-transparent pointer-events-none z-20 lg:hidden" />

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[960px] text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-surface-container-high px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline w-[180px]"
                  >
                    {t('compare.table.protocol')}
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    {t('compare.table.mechanism')}
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    {t('compare.table.ux')}
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    {t('compare.table.recipient')}
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    {t('compare.table.regulation')}
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    {t('compare.table.multichain')}
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    {t('compare.table.complexity')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant-30">
                {comparisonData.map((row) => (
                  <tr
                    key={row.protocol}
                    className={`transition-colors duration-150 ${
                      row.isWraith
                        ? 'bg-surface-bright font-semibold text-on-surface'
                        : 'hover:bg-surface-bright/40 text-on-surface-variant'
                    }`}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 px-[23px] py-[19px] md:px-6 md:py-5 font-heading text-sm border-r border-outline-variant-30 ${
                        row.isWraith
                          ? 'bg-surface-bright text-primary'
                          : 'bg-surface-container font-semibold text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{row.protocol}</span>
                        {row.isWraith && (
                          <span className="inline-block h-2 w-2 rounded-full bg-tertiary animate-pulse" />
                        )}
                      </div>
                    </th>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.mechanism}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.ux}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.recipient}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.regulation}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.multichain}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.complexity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6 mt-6">
          <div
            className="border-b border-outline-variant flex flex-wrap gap-1 md:gap-2"
            role="tablist"
            aria-label={t('compare.table.ariaLabel')}
          >
            {comparisonTabs.map((tab) => (
              <button
                key={tab}
                id={`comparison-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls="comparison-tabpanel"
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={handleTabKeyDown}
                className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] border-b-2 transition-all duration-150 -mb-[1px] ${
                  activeTab === tab
                    ? 'border-primary text-on-surface'
                    : 'border-transparent text-outline hover:text-on-surface-variant'
                }`}
              >
                {t(`compare.tabs.${tab}`)}
              </button>
            ))}
          </div>

          <div
            id="comparison-tabpanel"
            role="tabpanel"
            aria-labelledby={`comparison-tab-${activeTab}`}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-2"
          >
            {(activeTab === 'all' || activeTab === 'wraith') && (
              <div className="border border-tertiary-10 bg-surface-container p-8 flex flex-col gap-5 rounded-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-tertiary-10 rounded-full blur-3xl pointer-events-none opacity-50" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-tertiary">
                    {t('compare.cards.wraith.eyebrow')}
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-tertiary bg-tertiary-10">
                    {t('compare.cards.wraith.badge')}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  {t('compare.cards.wraith.heading')}
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {t('compare.cards.wraith.body')}
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    {t('compare.cards.wraith.whyLabel')}
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    {t('compare.cards.wraith.why')}
                  </p>
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'mixers') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    {t('compare.cards.mixers.eyebrow')}
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-error bg-error-10">
                    {t('compare.cards.mixers.badge')}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  {t('compare.cards.mixers.heading')}
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {t('compare.cards.mixers.body')}
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    {t('compare.cards.mixers.gapsLabel')}
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    {t('compare.cards.mixers.gaps')}
                  </p>
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'rollups') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    {t('compare.cards.rollups.eyebrow')}
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-blue bg-blue-10">
                    {t('compare.cards.rollups.badge')}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  {t('compare.cards.rollups.heading')}
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {t('compare.cards.rollups.body')}
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    {t('compare.cards.rollups.gapsLabel')}
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    {t('compare.cards.rollups.gaps')}
                  </p>
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'railgun') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    {t('compare.cards.railgun.eyebrow')}
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-on-surface-variant bg-surface-bright">
                    {t('compare.cards.railgun.badge')}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  {t('compare.cards.railgun.heading')}
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {t('compare.cards.railgun.body')}
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    {t('compare.cards.railgun.gapsLabel')}
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    {t('compare.cards.railgun.gaps')}
                  </p>
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'transparent') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    {t('compare.cards.transparent.eyebrow')}
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-outline bg-outline-variant-30">
                    {t('compare.cards.transparent.badge')}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  {t('compare.cards.transparent.heading')}
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {t('compare.cards.transparent.body')}
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    {t('compare.cards.transparent.gapsLabel')}
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    {t('compare.cards.transparent.gaps')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
