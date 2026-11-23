import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import { useLocalizedPath } from '../hooks/useLocalePath';
import {
  DEFAULT_MAX_RELOADS,
  DEFAULT_RELOAD_WINDOW_MS,
  RouteRecoveryContext,
  attemptBoundedChunkReload,
  getReloadAttemptCount,
  isBrowserOffline,
  isChunkLoadError,
} from '../utils/lazyWithRecovery';
import Footer from './Footer';
import Header from './Header';

export type RouteBoundaryVariant = 'page' | 'content' | 'section' | 'footer';

export interface RouteBoundaryProps {
  children: ReactNode;
  variant?: RouteBoundaryVariant;
  resetKey?: string;
  loadingLabel?: string;
  minHeightClass?: string;
  maxManualRetries?: number;
  maxReloads?: number;
  reloadWindowMs?: number;
  onReload?: () => void;
  storage?: Storage | null;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

const DEFAULT_MAX_MANUAL_RETRIES = 2;

let nextBoundaryInstance = 0;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
    };

    setReduced(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    return undefined;
  }, []);

  return reduced;
}

function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => !isBrowserOffline());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(!isBrowserOffline());
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

interface RouteLoadingFallbackProps {
  variant: RouteBoundaryVariant;
  label?: string;
  minHeightClass?: string;
}

export function RouteLoadingFallback({
  variant,
  label,
  minHeightClass,
}: RouteLoadingFallbackProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();

  const statusText =
    label ??
    (variant === 'footer'
      ? t('routeBoundary.loadingFooter')
      : variant === 'section'
        ? t('routeBoundary.loadingSection')
        : t('routeBoundary.loadingPage'));

  const shimmerClass = prefersReducedMotion
    ? 'bg-surface-bright opacity-70'
    : 'route-skeleton-shimmer bg-surface-bright animate-pulse';

  const resolvedMinHeight =
    minHeightClass ??
    (variant === 'footer'
      ? 'min-h-[320px]'
      : variant === 'section'
        ? 'min-h-[420px]'
        : 'min-h-[60vh]');

  if (variant === 'footer') {
    return (
      <footer
        className={`border-t border-outline-variant-30 bg-surface px-6 pb-8 pt-12 md:px-12 ${resolvedMinHeight}`}
        aria-busy="true"
        data-route-loading="footer"
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      >
        <div role="status" aria-live="polite" className="mx-auto flex max-w-336 flex-col gap-6">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {statusText}
          </span>
          <div aria-hidden="true" className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className={`h-24 border border-outline-variant-30 ${shimmerClass}`} />
            <div className={`h-24 border border-outline-variant-30 ${shimmerClass}`} />
            <div className={`h-24 border border-outline-variant-30 ${shimmerClass}`} />
            <div className={`h-24 border border-outline-variant-30 ${shimmerClass}`} />
          </div>
        </div>
      </footer>
    );
  }

  const loadingPanel = (
    <section
      aria-label={t('routeBoundary.loadingLabel')}
      aria-busy="true"
      data-route-loading={variant}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      className={`border-b border-outline-variant-30 px-6 py-16 md:px-12 ${resolvedMinHeight}`}
    >
      <div className="mx-auto flex max-w-336 flex-col gap-8">
        <div role="status" aria-live="polite" className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 bg-primary ${prefersReducedMotion ? '' : 'animate-pulse'}`}
          />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[1.8px] text-on-surface-variant">
            {statusText}
          </span>
        </div>

        <div aria-hidden="true" className="flex flex-col gap-4">
          <div className={`h-9 w-2/3 max-w-md border border-outline-variant-30 ${shimmerClass}`} />
          <div className={`h-4 w-full max-w-xl border border-outline-variant-30 ${shimmerClass}`} />
          <div className={`h-4 w-5/6 max-w-lg border border-outline-variant-30 ${shimmerClass}`} />
        </div>

        <div
          aria-hidden="true"
          className="grid grid-cols-1 gap-px bg-outline-variant sm:grid-cols-2"
        >
          <div className="flex flex-col gap-3 bg-surface-container p-6">
            <div className={`h-3 w-24 ${shimmerClass}`} />
            <div className={`h-5 w-48 ${shimmerClass}`} />
            <div className={`h-12 w-full ${shimmerClass}`} />
          </div>
          <div className="flex flex-col gap-3 bg-surface-container p-6">
            <div className={`h-3 w-24 ${shimmerClass}`} />
            <div className={`h-5 w-48 ${shimmerClass}`} />
            <div className={`h-12 w-full ${shimmerClass}`} />
          </div>
        </div>
      </div>
    </section>
  );

  if (variant === 'page') {
    return (
      <div className="flex min-h-screen flex-col bg-surface text-on-surface">
        <a href="#main-content" className="skip-link">
          {t('routeBoundary.skipToContent')}
        </a>
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 pt-24">
          {loadingPanel}
        </main>
        <Footer />
      </div>
    );
  }

  return loadingPanel;
}

interface RouteErrorFallbackProps {
  variant: RouteBoundaryVariant;
  error: Error;
  manualRetries: number;
  maxManualRetries: number;
  maxReloads: number;
  reloadWindowMs: number;
  currentPath: string;
  minHeightClass?: string;
  storage?: Storage | null;
  onRetry: () => void;
  onReload?: () => void;
  inRouter: boolean;
}

function RouteErrorFallback({
  variant,
  error,
  manualRetries,
  maxManualRetries,
  maxReloads,
  reloadWindowMs,
  currentPath,
  minHeightClass,
  storage,
  onRetry,
  onReload,
  inRouter,
}: RouteErrorFallbackProps) {
  const { t } = useTranslation();
  const lp = useLocalizedPath();
  const isOnline = useOnlineStatus();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [sawOfflineWhileMounted, setSawOfflineWhileMounted] = useState<boolean>(() => !isOnline);
  const [reloadStatus, setReloadStatus] = useState<'idle' | 'limit_reached' | 'offline'>(() => {
    const usedReloads = getReloadAttemptCount({
      path: currentPath,
      storage,
      maxReloads,
      windowMs: reloadWindowMs,
    });
    return usedReloads >= maxReloads ? 'limit_reached' : 'idle';
  });

  useEffect(() => {
    if (!isOnline) {
      setSawOfflineWhileMounted(true);
    } else if (reloadStatus === 'offline') {
      setReloadStatus('idle');
    }
  }, [isOnline, reloadStatus]);

  useEffect(() => {
    if (variant === 'page' || variant === 'content') {
      headingRef.current?.focus();
    }
  }, [variant]);

  const chunkFailure = isChunkLoadError(error);
  const connectionRestored = sawOfflineWhileMounted && isOnline;
  const retryLimitReached = manualRetries >= maxManualRetries && !connectionRestored;
  const reloadLimitReached = reloadStatus === 'limit_reached';
  const isPageLevel = variant === 'page' || variant === 'content';

  const eyebrow = !isOnline
    ? t('routeBoundary.eyebrowOffline')
    : chunkFailure
      ? t('routeBoundary.eyebrowUpdate')
      : t('routeBoundary.eyebrowRecovery');

  const heading = !isOnline
    ? t('routeBoundary.headingOffline')
    : chunkFailure
      ? t('routeBoundary.headingChunk')
      : isPageLevel
        ? t('routeBoundary.headingGeneric')
        : t('routeBoundary.headingSection');

  const body = !isOnline
    ? t('routeBoundary.bodyOffline')
    : chunkFailure
      ? t('routeBoundary.bodyChunk')
      : t('routeBoundary.bodyGeneric');

  const handleReloadClick = useCallback(() => {
    const result = attemptBoundedChunkReload({
      path: currentPath,
      storage,
      maxReloads,
      windowMs: reloadWindowMs,
      reload: onReload,
      offline: !isOnline,
    });

    if (result.reason === 'limit_reached') {
      setReloadStatus('limit_reached');
    } else if (result.reason === 'offline') {
      setReloadStatus('offline');
    }
  }, [currentPath, isOnline, maxReloads, onReload, reloadWindowMs, storage]);

  const resolvedMinHeight =
    minHeightClass ??
    (variant === 'footer'
      ? 'min-h-[320px]'
      : variant === 'section'
        ? 'min-h-[360px]'
        : 'min-h-[60vh]');

  const isHomeRoute = currentPath === '/' || currentPath === '/es' || currentPath === '/pt';
  const showHomeLink = isPageLevel || !isHomeRoute;
  const homeHref = inRouter ? lp('/') : '/';

  const recoveryBody = (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-6 border border-outline-variant bg-surface-container p-8"
      data-route-recovery={variant}
      data-offline={!isOnline ? 'true' : 'false'}
    >
      <div role="alert" className="flex flex-col gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-error">
          {eyebrow}
        </span>
        {isPageLevel ? (
          <h1
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-[28px] font-bold leading-[1.15] tracking-[-1px] text-on-surface sm:text-[36px]"
          >
            {heading}
          </h1>
        ) : (
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.6px] text-on-surface sm:text-[26px]"
          >
            {heading}
          </h2>
        )}
        <p className="max-w-2xl font-body text-[15px] leading-[1.65] text-on-surface-variant">
          {body}
        </p>
      </div>

      {connectionRestored && (
        <p
          role="status"
          aria-live="polite"
          className="border border-outline-variant bg-surface px-4 py-3 font-mono text-[11px] text-tertiary"
        >
          {t('routeBoundary.connectionRestored')}
        </p>
      )}

      {retryLimitReached && (
        <p
          role="status"
          aria-live="polite"
          className="border border-error-30 bg-error-10 px-4 py-3 font-body text-[13px] text-error"
        >
          {t('routeBoundary.retryLimitReached')}
        </p>
      )}

      {reloadStatus === 'limit_reached' && (
        <p
          role="status"
          aria-live="polite"
          className="border border-error-30 bg-error-10 px-4 py-3 font-body text-[13px] text-error"
        >
          {t('routeBoundary.reloadLimitReached')}
        </p>
      )}

      {reloadStatus === 'offline' && (
        <p
          role="status"
          aria-live="polite"
          className="border border-error-30 bg-error-10 px-4 py-3 font-body text-[13px] text-error"
        >
          {t('routeBoundary.offlineReloadBlocked')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={retryLimitReached}
          className="flex h-11 items-center justify-center bg-primary px-6 font-heading text-[12px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('routeBoundary.retryButton')}
        </button>

        <button
          type="button"
          onClick={handleReloadClick}
          disabled={reloadLimitReached || !isOnline}
          className="flex h-11 items-center justify-center border border-outline-variant bg-surface px-6 font-heading text-[12px] font-semibold uppercase tracking-[1.5px] text-on-surface transition-colors duration-150 hover:border-outline hover:bg-surface-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('routeBoundary.reloadButton')}
        </button>

        {showHomeLink &&
          (inRouter ? (
            <Link
              to={homeHref}
              className="flex h-11 items-center justify-center border border-outline-variant px-6 font-heading text-[12px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant transition-colors duration-150 hover:border-outline hover:text-on-surface"
            >
              {t('routeBoundary.homeLink')}
            </Link>
          ) : (
            <a
              href="/"
              className="flex h-11 items-center justify-center border border-outline-variant px-6 font-heading text-[12px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant transition-colors duration-150 hover:border-outline hover:text-on-surface"
            >
              {t('routeBoundary.homeLink')}
            </a>
          ))}
      </div>
    </div>
  );

  if (variant === 'footer') {
    return (
      <footer
        aria-labelledby={headingId}
        className={`border-t border-outline-variant-30 bg-surface px-6 pb-8 pt-12 md:px-12 ${resolvedMinHeight}`}
      >
        {recoveryBody}
      </footer>
    );
  }

  const recoverySection = (
    <section
      aria-labelledby={headingId}
      className={`border-b border-outline-variant-30 px-6 py-16 md:px-12 ${resolvedMinHeight}`}
    >
      {recoveryBody}
    </section>
  );

  if (variant === 'page') {
    return (
      <div className="flex min-h-screen flex-col bg-surface text-on-surface">
        <a href="#main-content" className="skip-link">
          {t('routeBoundary.skipToContent')}
        </a>
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 pt-24">
          {recoverySection}
        </main>
        <Footer />
      </div>
    );
  }

  return recoverySection;
}

interface ErrorBoundaryInnerProps {
  children: ReactNode;
  resetKey: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onResetByNavigation: () => void;
  renderFallback: (error: Error, clearError: () => void) => ReactNode;
}

interface ErrorBoundaryInnerState {
  error: Error | null;
}

class RouteErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, ErrorBoundaryInnerState> {
  override state: ErrorBoundaryInnerState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryInnerState {
    if (error instanceof Error) {
      return { error };
    }
    return { error: new Error(typeof error === 'string' ? error : 'Route load failure') };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryInnerProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error !== null) {
      this.setState({ error: null });
      this.props.onResetByNavigation();
    }
  }

  private clearError = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error !== null) {
      return this.props.renderFallback(this.state.error, this.clearError);
    }
    return this.props.children;
  }
}

interface RouteBoundaryCoreProps extends RouteBoundaryProps {
  resolvedResetKey: string;
  resolvedPath: string;
  inRouter: boolean;
}

function RouteBoundaryCore({
  children,
  variant = 'page',
  loadingLabel,
  minHeightClass,
  maxManualRetries = DEFAULT_MAX_MANUAL_RETRIES,
  maxReloads = DEFAULT_MAX_RELOADS,
  reloadWindowMs = DEFAULT_RELOAD_WINDOW_MS,
  onReload,
  storage,
  onError,
  resolvedResetKey,
  resolvedPath,
  inRouter,
}: RouteBoundaryCoreProps) {
  const [boundaryId] = useState<number>(() => {
    nextBoundaryInstance += 1;
    return nextBoundaryInstance;
  });
  const [retryVersion, setRetryVersion] = useState(0);
  const [manualRetries, setManualRetries] = useState(0);

  const prevResetKeyRef = useRef(resolvedResetKey);
  useEffect(() => {
    if (prevResetKeyRef.current !== resolvedResetKey) {
      prevResetKeyRef.current = resolvedResetKey;
      setManualRetries(0);
    }
  }, [resolvedResetKey]);

  const handleResetByNavigation = useCallback(() => {
    setManualRetries(0);
    setRetryVersion((prev) => prev + 1);
  }, []);

  const contextValue = useMemo(() => ({ boundaryId, retryVersion }), [boundaryId, retryVersion]);

  const fallbackElement = (
    <RouteLoadingFallback variant={variant} label={loadingLabel} minHeightClass={minHeightClass} />
  );

  return (
    <RouteRecoveryContext.Provider value={contextValue}>
      <RouteErrorBoundaryInner
        resetKey={resolvedResetKey}
        onError={onError}
        onResetByNavigation={handleResetByNavigation}
        renderFallback={(error, clearError) => (
          <RouteErrorFallback
            variant={variant}
            error={error}
            manualRetries={manualRetries}
            maxManualRetries={maxManualRetries}
            maxReloads={maxReloads}
            reloadWindowMs={reloadWindowMs}
            currentPath={resolvedPath}
            minHeightClass={minHeightClass}
            storage={storage}
            onReload={onReload}
            inRouter={inRouter}
            onRetry={() => {
              setManualRetries((prev) => prev + 1);
              setRetryVersion((prev) => prev + 1);
              clearError();
            }}
          />
        )}
      >
        <Suspense fallback={fallbackElement}>{children}</Suspense>
      </RouteErrorBoundaryInner>
    </RouteRecoveryContext.Provider>
  );
}

function RouterAwareRouteBoundary(props: RouteBoundaryProps) {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  return (
    <RouteBoundaryCore
      {...props}
      resolvedResetKey={props.resetKey ?? routeKey}
      resolvedPath={routeKey}
      inRouter
    />
  );
}

export default function RouteBoundary(props: RouteBoundaryProps) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RouterAwareRouteBoundary {...props} />;
  }

  const fallbackPath =
    typeof window !== 'undefined' && window.location
      ? `${window.location.pathname}${window.location.search}`
      : '/';

  return (
    <RouteBoundaryCore
      {...props}
      resolvedResetKey={props.resetKey ?? fallbackPath}
      resolvedPath={fallbackPath}
      inRouter={false}
    />
  );
}
