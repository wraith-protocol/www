import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Layout from './components/Layout';
import TrustStrip from './components/TrustStrip';
import PartnerStrip from './components/PartnerStrip';
import { ThemeProvider } from './context/ThemeContext';
import { usePageSeo } from './utils/seo';
import { changeLocale, type Locale } from './i18n';
import { useScrollToHash } from './hooks/useScrollToHash';
import {
  APP_ROUTES,
  SUPPORTED_LOCALE_PREFIXES,
  getLocalizedRoutes,
  withLocalePrefix,
  type AppRouteDefinition,
  type RouteComponent,
} from './routes/inventory';

// Lazy load below-the-fold homepage components
const StealthAnimation = lazy(() => import('./components/StealthAnimation'));
const Architecture = lazy(() => import('./components/Architecture'));
const ForDevelopers = lazy(() => import('./components/ForDevelopers'));
const Chains = lazy(() => import('./components/Chains'));
const StellarMetrics = lazy(() => import('./components/StellarMetrics'));
const Compare = lazy(() => import('./components/Compare'));
const Showcase = lazy(() => import('./components/Showcase'));
const CaseStudiesStrip = lazy(() => import('./components/CaseStudiesStrip'));
const EcosystemPartners = lazy(() => import('./components/EcosystemPartners'));
const CtaStrip = lazy(() => import('./components/CtaStrip'));
const Footer = lazy(() => import('./components/Footer'));

// Lazy load pages
const Faq = lazy(() => import('./pages/Faq'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Press = lazy(() => import('./pages/Press'));
const Newsletter = lazy(() => import('./pages/Newsletter'));
const UseCases = lazy(() => import('./pages/UseCases'));
const CostCalculatorPage = lazy(() => import('./pages/CostCalculatorPage'));
const Stellar = lazy(() => import('./pages/Stellar'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Grants = lazy(() => import('./pages/Grants'));
const CaseStudies = lazy(() => import('./pages/CaseStudies'));
const Careers = lazy(() => import('./pages/Careers'));
const About = lazy(() => import('./pages/About'));
const Governance = lazy(() => import('./pages/Governance'));
const Vitals = lazy(() => import('./pages/Vitals'));
const Security = lazy(() => import('./pages/Security'));
const ThreatModel = lazy(() => import('./pages/ThreatModel'));
const Status = lazy(() => import('./pages/Status'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Contributors = lazy(() => import('./pages/Contributors'));
const Blog = lazy(() => import('./pages/Blog'));
const Ecosystem = lazy(() => import('./pages/Ecosystem'));
const ChainsPage = lazy(() => import('./pages/Chains'));

/**
 * Sets the active locale based on the URL prefix, then renders `children`.
 * Used by locale-prefixed routes like /es/* and /pt/*.
 */
function LocaleScope({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    changeLocale(locale);
  }, [locale]);
  return <>{children}</>;
}

/**
 * Synchronises the i18n language with the URL.
 * When the user navigates to an unprefixed (English) route — i.e. a path that
 * does NOT start with /es or /pt — the locale is reset to English so that the
 * language state never lingers from a previous non-English visit.
 */
function LocaleSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isLocalePrefixed = pathname.startsWith('/es') || pathname.startsWith('/pt');
    if (!isLocalePrefixed) {
      changeLocale('en');
    }
    // locale-prefixed routes are handled by LocaleScope; no action needed here.
  }, [pathname]);
  return null;
}

function Home() {
  const seo = usePageSeo('home');
  useScrollToHash();

  return (
    <div className="bg-surface text-on-surface">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical} />
        {seo.alternates.map((alt) => (
          <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
        ))}
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonical} />
      </Helmet>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <TrustStrip />
        <Features />
        <Suspense fallback={null}>
          <StealthAnimation />
          <Architecture />
          <ForDevelopers />
          <Chains />
          <StellarMetrics />
          <Compare />
          <Showcase />
          <CaseStudiesStrip />
          <EcosystemPartners />
          <CtaStrip />
        </Suspense>
        <PartnerStrip />
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

/**
 * Every route component is registered here, keyed by the inventory's component
 * id. A route cannot be rendered unless the inventory declares its policy.
 */
const ROUTE_COMPONENTS: Record<RouteComponent, ComponentType> = {
  home: Home,
  faq: Faq,
  privacy: Privacy,
  terms: Terms,
  press: Press,
  newsletter: Newsletter,
  useCases: UseCases,
  costCalculator: CostCalculatorPage,
  roadmap: Roadmap,
  caseStudies: CaseStudies,
  ecosystem: Ecosystem,
  vitals: Vitals,
  security: Security,
  threatModel: ThreatModel,
  status: Status,
  stellar: Stellar,
  careers: Careers,
  grants: Grants,
  about: About,
  governance: Governance,
  contributors: Contributors,
  blog: Blog,
  chains: ChainsPage,
  notFound: NotFound,
};

function RouteElement({ route }: { route: AppRouteDefinition }) {
  const Page = ROUTE_COMPONENTS[route.component];
  return route.shell === 'layout' ? (
    <Layout>
      <Page />
    </Layout>
  ) : (
    <Page />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <LocaleSync />
        <Suspense fallback={null}>
          <Routes>
            {APP_ROUTES.map((route) => (
              <Route key={route.id} path={route.path} element={<RouteElement route={route} />} />
            ))}

            {/* Locale-prefixed variants generated from the same inventory. Each
                route activates the matching locale before rendering its page. */}
            {getLocalizedRoutes().flatMap((route) =>
              SUPPORTED_LOCALE_PREFIXES.map((locale) => (
                <Route
                  key={`${locale}-${route.id}`}
                  path={withLocalePrefix(locale, route.path)}
                  element={
                    <LocaleScope locale={locale}>
                      <RouteElement route={route} />
                    </LocaleScope>
                  }
                />
              )),
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
