import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from '../hooks/useInView';

type AnimationStep = 'idle' | 'sender' | 'generate' | 'announce' | 'scan' | 'receiver' | 'complete';

const stepDescriptions: Record<AnimationStep, { title: string; description: string }> = {
  idle: {
    title: 'Stealth Address Protocol',
    description: 'Click Play to see how stealth addresses protect recipient privacy on-chain.',
  },
  sender: {
    title: '1. Sender Prepares',
    description:
      "Sender obtains recipient's stealth meta-address (published once, reusable forever).",
  },
  generate: {
    title: '2. Generate Stealth Address',
    description:
      'Sender generates a one-time address using ephemeral keys. This address has never been seen before.',
  },
  announce: {
    title: '3. Public Announcement',
    description:
      'Sender publishes the ephemeral public key on-chain (in memo). The payment goes to the stealth address.',
  },
  scan: {
    title: '4. Recipient Scans',
    description:
      'Recipient scans all announcements using their viewing key to detect incoming payments.',
  },
  receiver: {
    title: '5. Derive Private Key',
    description:
      'Recipient derives the private key for this specific stealth address and can withdraw funds.',
  },
  complete: {
    title: 'Complete',
    description:
      'Transaction is complete. On-chain observers see only disconnected addresses and ephemeral data.',
  },
};

const steps: AnimationStep[] = ['sender', 'generate', 'announce', 'scan', 'receiver', 'complete'];

export default function StealthAnimation() {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [currentStep, setCurrentStep] = useState<AnimationStep>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!isPlaying || currentStep === 'complete') return;

    const timer = setTimeout(() => {
      const currentIndex = steps.indexOf(currentStep);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]!);
      } else {
        setCurrentStep('complete');
        setIsPlaying(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying]);

  const handlePlay = () => {
    setCurrentStep('sender');
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentStep('idle');
    setIsPlaying(false);
  };

  const handleStepClick = (step: AnimationStep) => {
    if (step === 'idle') return;
    setCurrentStep(step);
    setIsPlaying(false);
  };

  const currentIndex = steps.indexOf(currentStep);
  const progress = currentStep === 'idle' ? 0 : ((currentIndex + 1) / steps.length) * 100;

  return (
    <section
      ref={ref}
      className="border-t border-outline-variant-30 px-6 py-24 md:px-12"
      aria-label="Interactive stealth address explainer"
    >
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        <div className="flex flex-col gap-3" data-reveal={isInView}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            How It Works
          </span>
          <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
            Stealth Address Protocol
          </h2>
          <p className="font-body text-base leading-[1.6] text-on-surface-variant max-w-2xl">
            Interactive demonstration of how Wraith generates one-time addresses to protect
            recipient privacy. No two transactions use the same address.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Animation Canvas */}
          <div className="flex flex-col gap-4">
            <div className="border border-outline-variant bg-surface-container p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden">
              {reducedMotion ? (
                // Static diagram for reduced motion
                <StaticDiagram currentStep={currentStep} />
              ) : (
                // Animated SVG
                <AnimatedDiagram currentStep={currentStep} isPlaying={isPlaying} />
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {currentStep === 'idle' || currentStep === 'complete' ? (
                  <button
                    onClick={handlePlay}
                    className="flex h-10 items-center justify-center gap-2 bg-primary px-5 font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
                    aria-label="Play animation"
                  >
                    <PlayIcon />
                    <span>Play</span>
                  </button>
                ) : (
                  <button
                    onClick={isPlaying ? handlePause : handlePlay}
                    className="flex h-10 items-center justify-center gap-2 bg-primary px-5 font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
                    aria-label={isPlaying ? 'Pause animation' : 'Resume animation'}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    <span>{isPlaying ? 'Pause' : 'Resume'}</span>
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="flex h-10 items-center justify-center gap-2 border border-outline-variant px-5 font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
                  aria-label="Reset animation"
                >
                  <ResetIcon />
                  <span>Reset</span>
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex flex-col gap-2">
                <div className="h-1 bg-surface-bright overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Animation progress"
                  />
                </div>
                {reducedMotion && (
                  <span className="font-mono text-[10px] text-outline">
                    Motion reduced mode active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Text Explanation */}
          <div className="flex flex-col gap-6">
            <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-4">
              <h3 className="font-heading text-[20px] font-bold tracking-[-0.5px] text-on-surface">
                {stepDescriptions[currentStep].title}
              </h3>
              <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                {stepDescriptions[currentStep].description}
              </p>
            </div>

            {/* Step buttons */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {steps.map((step, index) => (
                <button
                  key={step}
                  onClick={() => handleStepClick(step)}
                  className={`flex flex-col gap-2 border p-4 transition-all duration-150 ${
                    currentStep === step
                      ? 'border-primary bg-surface-bright'
                      : 'border-outline-variant bg-surface-container hover:bg-surface-bright/50'
                  }`}
                  aria-label={`Jump to step ${index + 1}: ${stepDescriptions[step].title}`}
                  aria-pressed={currentStep === step}
                >
                  <span
                    className={`font-mono text-[10px] font-semibold tracking-[1.5px] ${
                      currentStep === step ? 'text-primary' : 'text-outline'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`font-body text-[12px] ${
                      currentStep === step
                        ? 'text-on-surface font-semibold'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {stepDescriptions[step].title.split('.')[1]?.trim() ||
                      stepDescriptions[step].title}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-outline-variant-30 pt-6 flex flex-col gap-3">
              <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                Key Privacy Benefits
              </h4>
              <ul className="flex flex-col gap-2 font-body text-[13px] text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="text-tertiary mt-1">✓</span>
                  <span>{t('stealthAnimation.benefits.unlinkable')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tertiary mt-1">✓</span>
                  <span>{t('stealthAnimation.benefits.unique')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tertiary mt-1">✓</span>
                  <span>{t('stealthAnimation.benefits.detectOnly')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tertiary mt-1">✓</span>
                  <span>{t('stealthAnimation.benefits.noCoordination')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Animated SVG Diagram
function AnimatedDiagram({
  currentStep,
  isPlaying,
}: {
  currentStep: AnimationStep;
  isPlaying: boolean;
}) {
  return (
    <svg
      viewBox="0 0 600 400"
      className="w-full h-full"
      aria-hidden="true"
      style={{ maxHeight: '400px' }}
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.1"
          />
        </pattern>
      </defs>
      <rect width="600" height="400" fill="url(#grid)" />

      {/* Sender (left) */}
      <g
        className={
          currentStep === 'sender' || currentStep !== 'idle' ? 'opacity-100' : 'opacity-50'
        }
      >
        <circle
          cx="100"
          cy="200"
          r="40"
          fill="currentColor"
          className="text-primary"
          opacity="0.2"
        />
        <circle cx="100" cy="200" r="30" fill="currentColor" className="text-primary" />
        <text
          x="100"
          y="205"
          textAnchor="middle"
          className="fill-surface font-heading text-sm font-bold"
        >
          SENDER
        </text>
        <text
          x="100"
          y="260"
          textAnchor="middle"
          className="fill-on-surface-variant font-mono text-xs"
        >
          Alice
        </text>
      </g>

      {/* Receiver (right) */}
      <g
        className={
          currentStep === 'receiver' || currentStep === 'complete' ? 'opacity-100' : 'opacity-50'
        }
      >
        <circle
          cx="500"
          cy="200"
          r="40"
          fill="currentColor"
          className="text-tertiary"
          opacity="0.2"
        />
        <circle cx="500" cy="200" r="30" fill="currentColor" className="text-tertiary" />
        <text
          x="500"
          y="205"
          textAnchor="middle"
          className="fill-surface font-heading text-sm font-bold"
        >
          RECEIVER
        </text>
        <text
          x="500"
          y="260"
          textAnchor="middle"
          className="fill-on-surface-variant font-mono text-xs"
        >
          Bob
        </text>
      </g>

      {/* Meta Address (top right) */}
      {(currentStep === 'sender' || currentStep !== 'idle') && (
        <g className="transition-opacity duration-500" opacity={currentStep === 'sender' ? 1 : 0.3}>
          <rect
            x="400"
            y="60"
            width="120"
            height="40"
            rx="4"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            className="text-outline-variant"
          />
          <text x="460" y="75" textAnchor="middle" className="fill-outline font-mono text-[10px]">
            Meta Address
          </text>
          <text x="460" y="90" textAnchor="middle" className="fill-on-surface font-mono text-[9px]">
            st:xlm:...
          </text>
        </g>
      )}

      {/* Stealth Address (center) */}
      {currentStep === 'generate' && (
        <g className="transition-opacity duration-500">
          <circle
            cx="300"
            cy="200"
            r="50"
            fill="currentColor"
            className="text-tertiary"
            opacity="0.1"
          >
            <animate attributeName="r" values="30;50;30" dur="2s" repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0.3;0.1;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <rect
            x="240"
            y="185"
            width="120"
            height="30"
            rx="4"
            fill="currentColor"
            className="text-tertiary"
          />
          <text
            x="300"
            y="205"
            textAnchor="middle"
            className="fill-surface font-mono text-xs font-bold"
          >
            G...NEW
          </text>
        </g>
      )}

      {/* Transaction arrow (announce) */}
      {(currentStep === 'announce' ||
        currentStep === 'scan' ||
        currentStep === 'receiver' ||
        currentStep === 'complete') && (
        <g>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="currentColor" className="text-primary" />
            </marker>
          </defs>
          <line
            x1="150"
            y1="200"
            x2="450"
            y2="200"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
            markerEnd="url(#arrowhead)"
            strokeDasharray={currentStep === 'announce' && isPlaying ? '5,5' : '0'}
          >
            {currentStep === 'announce' && isPlaying && (
              <animate
                attributeName="stroke-dashoffset"
                values="10;0"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </line>
          <rect
            x="240"
            y="175"
            width="120"
            height="25"
            rx="4"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary"
          />
          <text
            x="300"
            y="192"
            textAnchor="middle"
            className="fill-primary font-mono text-[10px] font-semibold"
          >
            Ephemeral PubKey
          </text>
        </g>
      )}

      {/* Scanning waves */}
      {(currentStep === 'scan' || currentStep === 'receiver' || currentStep === 'complete') && (
        <g>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx="500"
              cy="200"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-tertiary"
              opacity="0"
            >
              {currentStep === 'scan' && isPlaying && (
                <>
                  <animate
                    attributeName="r"
                    values="30;80"
                    dur="2s"
                    begin={`${i * 0.6}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0"
                    dur="2s"
                    begin={`${i * 0.6}s`}
                    repeatCount="indefinite"
                  />
                </>
              )}
            </circle>
          ))}
        </g>
      )}

      {/* Private key (receiver) */}
      {(currentStep === 'receiver' || currentStep === 'complete') && (
        <g className="transition-opacity duration-500">
          <rect
            x="420"
            y="280"
            width="160"
            height="30"
            rx="4"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            className="text-tertiary"
          />
          <text
            x="500"
            y="300"
            textAnchor="middle"
            className="fill-tertiary font-mono text-[10px] font-semibold"
          >
            Stealth Private Key ✓
          </text>
        </g>
      )}
    </svg>
  );
}

// Static Diagram for reduced motion
function StaticDiagram({ currentStep }: { currentStep: AnimationStep }) {
  return (
    <svg
      viewBox="0 0 600 400"
      className="w-full h-full"
      aria-label="Static stealth address protocol diagram"
      style={{ maxHeight: '400px' }}
    >
      {/* Background */}
      <rect width="600" height="400" fill="currentColor" className="text-surface" opacity="0.5" />

      {/* Sender */}
      <circle cx="100" cy="200" r="30" fill="currentColor" className="text-primary" />
      <text
        x="100"
        y="205"
        textAnchor="middle"
        className="fill-surface font-heading text-sm font-bold"
      >
        SENDER
      </text>
      <text
        x="100"
        y="250"
        textAnchor="middle"
        className="fill-on-surface-variant font-mono text-xs"
      >
        Alice
      </text>

      {/* Arrow */}
      <defs>
        <marker
          id="arrow-static"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="currentColor" className="text-primary" />
        </marker>
      </defs>
      <line
        x1="150"
        y1="200"
        x2="450"
        y2="200"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        markerEnd="url(#arrow-static)"
      />

      {/* Transaction label */}
      <rect
        x="240"
        y="175"
        width="120"
        height="25"
        rx="4"
        fill="currentColor"
        className="text-surface-bright"
      />
      <text x="300" y="192" textAnchor="middle" className="fill-on-surface font-mono text-[10px]">
        Stealth Payment
      </text>

      {/* Receiver */}
      <circle cx="500" cy="200" r="30" fill="currentColor" className="text-tertiary" />
      <text
        x="500"
        y="205"
        textAnchor="middle"
        className="fill-surface font-heading text-sm font-bold"
      >
        RECEIVER
      </text>
      <text
        x="500"
        y="250"
        textAnchor="middle"
        className="fill-on-surface-variant font-mono text-xs"
      >
        Bob
      </text>

      {/* Step indicator */}
      <rect
        x="200"
        y="320"
        width="200"
        height="40"
        rx="4"
        fill="currentColor"
        className="text-surface-bright"
      />
      <text x="300" y="345" textAnchor="middle" className="fill-on-surface font-body text-sm">
        {currentStep === 'idle' ? 'Ready to start' : stepDescriptions[currentStep].title}
      </text>
    </svg>
  );
}

// Icon components
function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 1L10 6L2 11V1Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="1" width="3" height="10" fill="currentColor" />
      <rect x="7" y="1" width="3" height="10" fill="currentColor" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 6C2 3.79 3.79 2 6 2C8.21 2 10 3.79 10 6C10 8.21 8.21 10 6 10C4.5 10 3.2 9.2 2.5 8" />
      <path d="M2 4V6H4" />
    </svg>
  );
}
