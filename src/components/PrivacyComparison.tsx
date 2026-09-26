import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type DataPoint = 'sender' | 'recipient' | 'amount' | 'memo' | 'timestamp' | 'asset' | 'sequence';

type DataVisibility = {
  [key in DataPoint]: boolean;
};

const normalStellarVisibility: DataVisibility = {
  sender: true,
  recipient: true,
  amount: true,
  memo: true,
  timestamp: true,
  asset: true,
  sequence: true,
};

const wraithVisibility: DataVisibility = {
  sender: false,
  recipient: false,
  amount: false,
  memo: false,
  timestamp: true,
  asset: false,
  sequence: true,
};

interface DataFieldProps {
  label: string;
  value: string;
  isPublic: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  reducedMotion: boolean;
}

function DataField({ label, value, isPublic, isHovered, onHover, reducedMotion }: DataFieldProps) {
  const publicClass = isPublic
    ? 'bg-error-10 border-error text-error'
    : 'bg-tertiary-10 border-tertiary text-tertiary';

  const hoverClass = isHovered && !reducedMotion ? 'scale-[1.02] shadow-md' : '';

  return (
    <div
      className={`group flex items-start justify-between gap-3 border ${publicClass} px-4 py-3 rounded-sm transition-all duration-200 cursor-default ${hoverClass}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${isPublic ? 'publicly visible' : 'private'}`}
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] opacity-70">
          {label}
        </span>
        <span className="font-body text-[13px] font-medium truncate">{value}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isPublic ? (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </div>
    </div>
  );
}

interface TransactionCardProps {
  title: string;
  subtitle: string;
  visibility: DataVisibility;
  hoveredField: DataPoint | null;
  onFieldHover: (field: DataPoint | null) => void;
  reducedMotion: boolean;
}

function TransactionCard({
  title,
  subtitle,
  visibility,
  hoveredField,
  onFieldHover,
  reducedMotion,
}: TransactionCardProps) {
  const fields: Array<{ key: DataPoint; label: string; value: string }> = [
    { key: 'sender', label: 'Sender', value: 'GAXYZ...ABC123' },
    { key: 'recipient', label: 'Recipient', value: 'GBDEF...XYZ789' },
    { key: 'amount', label: 'Amount', value: '500 XLM' },
    { key: 'asset', label: 'Asset', value: 'XLM (native)' },
    { key: 'memo', label: 'Memo', value: 'Invoice #4521' },
    { key: 'timestamp', label: 'Timestamp', value: '2026-07-24 14:32' },
    { key: 'sequence', label: 'Sequence', value: '123456789' },
  ];

  return (
    <div className="flex flex-col gap-4 border border-outline-variant bg-surface-container p-6 rounded-sm">
      <div className="flex flex-col gap-2 pb-3 border-b border-outline-variant-30">
        <h3 className="font-heading text-[18px] font-bold tracking-[-0.4px] text-on-surface">
          {title}
        </h3>
        <p className="font-body text-[13px] text-on-surface-variant">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-2">
        {fields.map((field) => (
          <DataField
            key={field.key}
            label={field.label}
            value={field.value}
            isPublic={visibility[field.key]}
            isHovered={hoveredField === field.key}
            onHover={(hovered) => onFieldHover(hovered ? field.key : null)}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

export default function PrivacyComparison() {
  const { t } = useTranslation();
  const [hoveredField, setHoveredField] = useState<DataPoint | null>(null);
  const [reducedMotion] = useState(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const publicCount = Object.values(normalStellarVisibility).filter(Boolean).length;
  const wraithPublicCount = Object.values(wraithVisibility).filter(Boolean).length;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
          Visual Comparison
        </span>
        <h2 className="font-heading text-[24px] font-bold tracking-[-0.8px] text-on-surface">
          What&apos;s Public?
        </h2>
        <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant max-w-2xl">
          A typical Stellar transaction exposes all details publicly on the ledger. Wraith Protocol
          hides sender, recipient, amount, and asset information — only metadata like timestamps
          remain visible for network operation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TransactionCard
          title="Normal Stellar Payment"
          subtitle={`${publicCount} of 7 fields publicly visible`}
          visibility={normalStellarVisibility}
          hoveredField={hoveredField}
          onFieldHover={setHoveredField}
          reducedMotion={reducedMotion}
        />
        <TransactionCard
          title="Wraith Stealth Transaction"
          subtitle={`${wraithPublicCount} of 7 fields publicly visible`}
          visibility={wraithVisibility}
          hoveredField={hoveredField}
          onFieldHover={setHoveredField}
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="flex items-start gap-4 border border-outline-variant bg-surface-container-high px-5 py-4 rounded-sm">
        <div className="flex gap-4 flex-wrap text-[12px] font-mono">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-error bg-error-10 rounded-sm" />
            <span className="text-on-surface-variant">
              {t('privacyComparison.legend.publicData')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-tertiary bg-tertiary-10 rounded-sm" />
            <span className="text-on-surface-variant">
              {t('privacyComparison.legend.privateData')}
            </span>
          </div>
        </div>
        <p className="font-body text-[12px] leading-[1.6] text-outline ml-auto hidden sm:block">
          Hover over fields to highlight
        </p>
      </div>
    </section>
  );
}
