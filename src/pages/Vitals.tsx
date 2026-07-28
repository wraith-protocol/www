import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useVitals } from '../hooks/useVitals';
import {
  MetricType,
  METRIC_DEFINITIONS,
  SITE_PAGES,
  SitePage,
  MetricRating,
} from '../data/vitalsData';

function getRatingBadge(rating: MetricRating) {
  switch (rating) {
    case 'good':
      return {
        label: 'GOOD',
        colorClass: 'border-[#22c55e]/40 bg-[#22c55e]/15 text-[#22c55e]',
        dotClass: 'bg-[#22c55e]',
      };
    case 'needs-improvement':
      return {
        label: 'NEEDS IMPROVEMENT',
        colorClass: 'border-[#c4c7c5]/40 bg-[#c4c7c5]/15 text-[#c4c7c5]',
        dotClass: 'bg-[#c4c7c5]',
      };
    case 'poor':
      return {
        label: 'POOR',
        colorClass: 'border-[#ee7d77]/40 bg-[#ee7d77]/15 text-[#ee7d77]',
        dotClass: 'bg-[#ee7d77]',
      };
  }
}

export default function Vitals() {
  const { dntEnabled, getSummary } = useVitals();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('LCP');
  const [selectedPage, setSelectedPage] = useState<SitePage>('All Pages');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const lcpSummary = getSummary('LCP', selectedPage);
  const inpSummary = getSummary('INP', selectedPage);
  const clsSummary = getSummary('CLS', selectedPage);

  const activeSummary = getSummary(selectedMetric, selectedPage);
  const activeDef = METRIC_DEFINITIONS[selectedMetric];

  // SVG chart layout math
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const points = activeSummary.dailyPoints;
  const maxVal = Math.max(
    activeDef.poorThreshold * 1.1,
    ...points.map((p) => p.value),
    activeSummary.p75Value,
  );
  const minVal = 0;

  const getX = (index: number) => {
    if (points.length <= 1) return paddingX;
    return paddingX + (index / (points.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    return chartHeight - paddingY - ratio * innerHeight;
  };

  const targetY = getY(activeDef.goodThreshold);

  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.value);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const hoveredPoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : null;

  return (
    <Layout>
      <div className="mx-auto max-w-[960px] px-6 py-12 md:px-12">
        <div className="flex flex-col gap-10">
          {/* Header Section */}
          <div className="flex flex-col gap-4 border-b border-outline-variant pb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                Transparency & Performance
              </span>
              {/* DNT Status Badge */}
              <div
                tabIndex={0}
                role="region"
                aria-label="Do-Not-Track Status"
                className={`inline-flex items-center gap-2 border px-3 py-1 font-mono text-[11px] uppercase tracking-[1px] ${
                  dntEnabled
                    ? 'border-[#c4c7c5]/50 bg-[#c4c7c5]/10 text-[#c4c7c5]'
                    : 'border-[#22c55e]/40 bg-[#22c55e]/15 text-[#22c55e]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${dntEnabled ? 'bg-[#c4c7c5]' : 'bg-[#22c55e]'}`}
                  aria-hidden="true"
                />
                <span>
                  DNT RESPECTED:{' '}
                  {dntEnabled ? 'ENABLED (TELEMETRY PAUSED)' : 'ACTIVE (TELEMETRY ON)'}
                </span>
              </div>
            </div>

            <h1 className="font-heading text-[36px] font-bold tracking-[-1.5px] text-on-surface sm:text-[44px]">
              Web Vitals Dashboard
            </h1>

            <p className="font-body text-[15px] leading-[1.6] text-on-surface-variant max-w-[760px]">
              Real-user monitoring (RUM) performance telemetry for{' '}
              <code className="font-mono text-xs text-primary bg-surface-container px-1.5 py-0.5 border border-outline-variant">
                usewraith.xyz
              </code>{' '}
              over rolling 30-day windows. We publish metric percentiles openly to enforce
              performance accountability.
            </p>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'LCP' as MetricType, summary: lcpSummary },
              { type: 'INP' as MetricType, summary: inpSummary },
              { type: 'CLS' as MetricType, summary: clsSummary },
            ].map(({ type, summary }) => {
              const def = METRIC_DEFINITIONS[type];
              const badge = getRatingBadge(summary.rating);
              const isSelected = selectedMetric === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedMetric(type)}
                  className={`flex flex-col justify-between p-5 text-left transition-all duration-150 border ${
                    isSelected
                      ? 'border-primary bg-surface-container'
                      : 'border-outline-variant bg-surface hover:border-outline hover:bg-surface-container/50'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold uppercase tracking-[1.5px] text-outline">
                        {def.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${badge.colorClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                        {badge.label}
                      </span>
                    </div>
                    <span className="font-heading text-xs font-medium text-on-surface-variant">
                      {def.fullName}
                    </span>
                  </div>

                  <div className="my-4 flex items-baseline gap-2">
                    <span className="font-mono text-[36px] font-bold tracking-tight text-on-surface">
                      {summary.p75Value}
                    </span>
                    {summary.unit && (
                      <span className="font-mono text-sm text-outline">{summary.unit}</span>
                    )}
                    <span className="ml-auto font-mono text-[11px] text-outline">p75 (75th %)</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/40 pt-3 font-mono text-[11px] text-outline">
                    <span>Target: {def.targetFormatted}</span>
                    <span>{summary.totalSamples.toLocaleString()} samples</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Controls: Metric Tabs + Page Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-outline-variant bg-surface-container p-4">
            {/* Metric Switcher */}
            <div className="flex items-center gap-1" role="tablist" aria-label="Metric Selector">
              {(['LCP', 'INP', 'CLS'] as MetricType[]).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={selectedMetric === m}
                  onClick={() => setSelectedMetric(m)}
                  className={`px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-[1px] transition-colors ${
                    selectedMetric === m
                      ? 'bg-primary text-surface font-bold'
                      : 'bg-surface text-outline hover:text-on-surface hover:bg-surface-bright'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Page Filter Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label
                htmlFor="page-filter"
                className="font-mono text-xs text-outline whitespace-nowrap"
              >
                Page:
              </label>
              <select
                id="page-filter"
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value as SitePage)}
                className="w-full sm:w-auto border border-outline-variant bg-surface px-3 py-1.5 font-mono text-xs text-on-surface focus:border-primary focus:outline-none"
              >
                {SITE_PAGES.map((page) => (
                  <option key={page} value={page}>
                    {page}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive 30-Day Rolling Chart */}
          <div className="flex flex-col gap-4 border border-outline-variant bg-surface p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/60 pb-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-on-surface">
                  Rolling 30-Day {activeDef.fullName} ({activeDef.name})
                </h2>
                <p className="font-body text-xs text-outline">
                  Daily p75 measurement for{' '}
                  <span className="text-on-surface font-mono">{selectedPage}</span>
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs text-outline">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-primary" /> Daily Value
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-[#22c55e] stroke-dasharray-2" /> Target (
                  {activeDef.targetFormatted})
                </span>
              </div>
            </div>

            {/* Chart SVG Canvas */}
            <div className="relative w-full overflow-x-auto py-2">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[600px]"
                aria-label={`30-day ${activeDef.name} trend chart`}
              >
                {/* Target Baseline */}
                {targetY >= paddingY && targetY <= chartHeight - paddingY && (
                  <line
                    x1={paddingX}
                    y1={targetY}
                    x2={chartWidth - paddingX}
                    y2={targetY}
                    stroke="#22c55e"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                )}

                {/* Grid horizontal lines */}
                {[0, 0.5, 1].map((ratio) => {
                  const y = paddingY + ratio * innerHeight;
                  return (
                    <line
                      key={ratio}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#444444"
                      strokeWidth="0.5"
                      opacity="0.4"
                    />
                  );
                })}

                {/* Trend Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#c6c6c7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {points.map((pt, idx) => {
                  const cx = getX(idx);
                  const cy = getY(pt.value);
                  const isHovered = hoveredPointIndex === idx;
                  const isGood = pt.rating === 'good';

                  return (
                    <g key={pt.date}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? '6' : '3.5'}
                        fill={isHovered ? '#c6c6c7' : isGood ? '#22c55e' : '#ee7d77'}
                        stroke="#0e0e0e"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredPoint && hoveredPointIndex !== null && (
                <div
                  className="absolute pointer-events-none border border-outline bg-surface-container p-2.5 shadow-lg font-mono text-xs text-on-surface"
                  style={{
                    left: `${Math.min(80, Math.max(10, (hoveredPointIndex / 29) * 100))}%`,
                    top: '10px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="font-bold text-primary">{hoveredPoint.formattedDate}</div>
                  <div className="text-outline text-[11px]">{hoveredPoint.date}</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span>Value:</span>
                    <span className="font-bold text-on-surface">
                      {hoveredPoint.value} {activeDef.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Samples:</span>
                    <span className="text-outline">{hoveredPoint.samples}</span>
                  </div>
                </div>
              )}
            </div>

            {/* X-Axis Date Labels */}
            <div className="flex items-center justify-between px-1 font-mono text-[11px] text-outline">
              <span>{points[0]?.formattedDate}</span>
              <span>{points[14]?.formattedDate}</span>
              <span>{points[29]?.formattedDate}</span>
            </div>
          </div>

          {/* Metric Documentation Section */}
          <div className="flex flex-col gap-8 border-t border-outline-variant pt-10">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                Documentation
              </span>
              <h2 className="font-heading text-[28px] font-bold text-on-surface">
                Understanding Core Web Vitals
              </h2>
              <p className="font-body text-[14px] text-on-surface-variant max-w-[720px]">
                Web Vitals are standardized performance metrics developed by Google to measure key
                dimensions of user experience.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {(['LCP', 'INP', 'CLS'] as MetricType[]).map((metricKey) => {
                const def = METRIC_DEFINITIONS[metricKey];

                return (
                  <div
                    key={metricKey}
                    className="flex flex-col gap-4 border border-outline-variant bg-surface p-6"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-primary border border-outline-variant px-2.5 py-1 bg-surface-container">
                          {def.name}
                        </span>
                        <h3 className="font-heading text-lg font-bold text-on-surface">
                          {def.fullName}
                        </h3>
                      </div>
                      <span className="font-mono text-xs text-outline">
                        Good Target:{' '}
                        <strong className="text-on-surface">{def.targetFormatted}</strong>
                      </span>
                    </div>

                    <p className="font-body text-[14px] leading-[1.6] text-on-surface-variant">
                      {def.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-outline-variant/40 pt-4 font-body text-[13px]">
                      <div>
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-outline block mb-1">
                          User Experience Impact
                        </span>
                        <p className="text-on-surface-variant">{def.impact}</p>
                      </div>
                      <div>
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-outline block mb-1">
                          Wraith Protocol Optimization
                        </span>
                        <p className="text-on-surface-variant">{def.optimization}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DNT Privacy Statement */}
            <div className="border border-outline-variant bg-surface-container p-6 flex flex-col gap-3">
              <h3 className="font-heading text-base font-bold text-on-surface">
                Do-Not-Track (DNT) Privacy Guarantee
              </h3>
              <p className="font-body text-xs leading-[1.6] text-on-surface-variant">
                We believe performance monitoring should never compromise user privacy. Client-side
                telemetry strictly respects browser privacy signals (
                <code className="font-mono text-[11px]">DNT: 1</code> or{' '}
                <code className="font-mono text-[11px]">GPC: true</code>). When enabled, no vitals
                events are recorded or transmitted. Read our full data practices on our{' '}
                <Link to="/privacy" className="text-primary underline hover:text-on-surface">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
