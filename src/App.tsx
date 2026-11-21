import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Layout from './components/Layout';
import RouteBoundary from './components/RouteBoundary';
import TrustStrip from './components/TrustStrip';
import PartnerStrip from './components/PartnerStrip';
import { ThemeProvider } from './context/ThemeContext';
import { usePageSeo } from './utils/seo';
import { lazyWithRecovery } from './utils/lazyWithRecovery';
import { changeLocale, type Locale } from './i18n';
import { useScrollToHash } from './hooks/useScrollToHash';

// Lazy load below-the-fold homepage components
const StealthAnimation = lazyWithRecovery(() => import('./components/StealthAnimation'));
const Architecture = lazyWithRecovery(() => import('./components/Architecture'));
const ForDevelopers = lazyWithRecovery(() => import('./components/ForDevelopers'));
const Chains = lazyWithRecovery(() => import('./components/Chains'));
const StellarMetrics = lazyWithRecovery(() => import('./components/StellarMetrics'));
const Compare = lazyWithRecovery(() => import('./components/Compare'));
const Showcase = lazyWithRecovery(() => import('./components/Showcase'));
const CaseStudiesStrip = lazyWithRecovery(() => import('./components/CaseStudiesStrip'));
const EcosystemPartners = lazyWithRecovery(() => import('./components/EcosystemPartners'));
const CtaStrip = lazyWithRecovery(() => import('./components/CtaStrip'));
const Footer = lazyWithRecovery(() => import('./components/Footer'));

// Lazy load pages
const Faq = lazyWithRecovery(() => import('./pages/Faq'));
const Privacy = lazyWithRecovery(() => import('./pages/Privacy'));
const Terms = lazyWithRecovery(() => import('./pages/Terms'));
const Press = lazyWithRecovery(() => import('./pages/Press'));
const Newsletter = lazyWithRecovery(() => import('./pages/Newsletter'));
const UseCases = lazyWithRecovery(() => import('./pages/UseCases'));
const CostCalculatorPage = lazyWithRecovery(() => import('./pages/CostCalculatorPage'));
const Stellar = lazyWithRecovery(() => import('./pages/Stellar'));
const Roadmap = lazyWithRecovery(() => import('./pages/Roadmap'));
const Grants = lazyWithRecovery(() => import('./pages/Grants'));
const CaseStudies = lazyWithRecovery(() => import('./pages/CaseStudies'));
const Careers = lazyWithRecovery(() => import('./pages/Careers'));
const About = lazyWithRecovery(() => import('./pages/About'));
const Governance = lazyWithRecovery(() => import('./pages/Governance'));
const Vitals = lazyWithRecovery(() => import('./pages/Vitals'));
const Security = lazyWithRecovery(() => import('./pages/Security'));
const ThreatModel = lazyWithRecovery(() => import('./pages/ThreatModel'));
const Status = lazyWithRecovery(() => import('./pages/Status'));
const NotFound = lazyWithRecovery(() => import('./pages/NotFound'));
const Contributors = lazyWithRecovery(() => import('./pages/Contributors'));
const Blog = lazyWithRecovery(() => import('./pages/Blog'));
const Ecosystem = lazyWithRecovery(() => import('./pages/Ecosystem'));
const ChainsPage = lazyWithRecovery(() => import('./pages/Chains'));

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
        <RouteBoundary variant="section" minHeightClass="min-h-[480px]">
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
        </RouteBoundary>
        <PartnerStrip />
      </main>
      <RouteBoundary variant="footer">
        <Footer />
      </RouteBoundary>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <LocaleSync />
        <RouteBoundary variant="page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/press" element={<Press />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/use-cases/calculator" element={<CostCalculatorPage />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/case-studies/:slug" element={<CaseStudies />} />
            <Route
              path="/ecosystem"
              element={
                <Layout>
                  <Ecosystem />
                </Layout>
              }
            />
            <Route path="/vitals" element={<Vitals />} />
            <Route
              path="/security"
              element={
                <Layout>
                  <Security />
                </Layout>
              }
            />
            <Route
              path="/threat-model"
              element={
                <Layout>
                  <ThreatModel />
                </Layout>
              }
            />
            {/* Status page route */}
            <Route
              path="/status"
              element={
                <Layout>
                  <Status />
                </Layout>
              }
            />
            {/* Wrap Stellar with Layout */}
            <Route
              path="/stellar"
              element={
                <Layout>
                  <Stellar />
                </Layout>
              }
            />
            <Route
              path="/careers"
              element={
                <Layout>
                  <Careers />
                </Layout>
              }
            />
            <Route
              path="/grants"
              element={
                <Layout>
                  <Grants />
                </Layout>
              }
            />
            <Route
              path="/about"
              element={
                <Layout>
                  <About />
                </Layout>
              }
            />
            <Route
              path="/governance"
              element={
                <Layout>
                  <Governance />
                </Layout>
              }
            />
            <Route
              path="/contributors"
              element={
                <Layout>
                  <Contributors />
                </Layout>
              }
            />
            <Route
              path="/blog"
              element={
                <Layout>
                  <Blog />
                </Layout>
              }
            />
            <Route
              path="/blog/tag/:tagSlug"
              element={
                <Layout>
                  <Blog />
                </Layout>
              }
            />
            <Route
              path="/blog/:slug"
              element={
                <Layout>
                  <Blog />
                </Layout>
              }
            />
            <Route
              path="/blog/author/:authorId"
              element={
                <Layout>
                  <Blog />
                </Layout>
              }
            />
            <Route
              path="/chains"
              element={
                <Layout>
                  <ChainsPage />
                </Layout>
              }
            />
            <Route path="*" element={<NotFound />} />

            {/* ── Locale-prefixed routes (/es/*, /pt/*) ────────────────────
                These are the distinct, crawlable URLs referenced by hreflang
                alternates. Each route activates the matching locale then
                renders the same page component as its English counterpart.    */}
            {(['es', 'pt'] as const).map((locale) => (
              <>
                <Route
                  key={`${locale}-home`}
                  path={`/${locale}`}
                  element={
                    <LocaleScope locale={locale}>
                      <Home />
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-stellar`}
                  path={`/${locale}/stellar`}
                  element={
                    <LocaleScope locale={locale}>
                      <Layout>
                        <Stellar />
                      </Layout>
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-grants`}
                  path={`/${locale}/grants`}
                  element={
                    <LocaleScope locale={locale}>
                      <Layout>
                        <Grants />
                      </Layout>
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-blog`}
                  path={`/${locale}/blog`}
                  element={
                    <LocaleScope locale={locale}>
                      <Layout>
                        <Blog />
                      </Layout>
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-blog-slug`}
                  path={`/${locale}/blog/:slug`}
                  element={
                    <LocaleScope locale={locale}>
                      <Layout>
                        <Blog />
                      </Layout>
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-blog-author`}
                  path={`/${locale}/blog/author/:authorId`}
                  element={
                    <LocaleScope locale={locale}>
                      <Layout>
                        <Blog />
                      </Layout>
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-blog-tag`}
                  path={`/${locale}/blog/tag/:tagSlug`}
                  element={
                    <LocaleScope locale={locale}>
                      <Layout>
                        <Blog />
                      </Layout>
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-case-studies`}
                  path={`/${locale}/case-studies`}
                  element={
                    <LocaleScope locale={locale}>
                      <CaseStudies />
                    </LocaleScope>
                  }
                />
                <Route
                  key={`${locale}-case-studies-slug`}
                  path={`/${locale}/case-studies/:slug`}
                  element={
                    <LocaleScope locale={locale}>
                      <CaseStudies />
                    </LocaleScope>
                  }
                />
              </>
            ))}
          </Routes>
        </RouteBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}
