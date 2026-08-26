import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Layout from './components/Layout';
import TrustStrip from './components/TrustStrip';
import PartnerStrip from './components/PartnerStrip';
import { ThemeProvider } from './context/ThemeContext';
import { Seo } from './utils/seo';
import { changeLocale, type Locale } from './i18n';

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
const Newsletter = lazy(() => import('./pages/Newsletter'));
const UseCases = lazy(() => import('./pages/UseCases'));
const Stellar = lazy(() => import('./pages/Stellar'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Grants = lazy(() => import('./pages/Grants'));
const CaseStudies = lazy(() => import('./pages/CaseStudies'));
const Careers = lazy(() => import('./pages/Careers'));
const About = lazy(() => import('./pages/About'));
const Vitals = lazy(() => import('./pages/Vitals'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Contributors = lazy(() => import('./pages/Contributors'));
const Blog = lazy(() => import('./pages/Blog'));

/** Sets the i18n locale on mount for locale-prefixed routes. */
function LocaleSetter({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    changeLocale(locale);
  }, [locale]);
  return <>{children}</>;
}

function Home() {
  return (
    <div className="bg-surface text-on-surface">
      <Seo
        title="Wraith Protocol — Private payments for every chain"
        description="Wraith Protocol enables private payments on any blockchain using stealth addresses. One SDK, multiple chains."
      />
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

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/case-studies/:slug" element={<CaseStudies />} />
            <Route path="/vitals" element={<Vitals />} />
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
              path="/blog/:slug"
              element={
                <Layout>
                  <Blog />
                </Layout>
              }
            />

            {/* Spanish locale-prefixed routes */}
            <Route
              path="/es"
              element={
                <LocaleSetter locale="es">
                  <Home />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/faq"
              element={
                <LocaleSetter locale="es">
                  <Faq />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/privacy"
              element={
                <LocaleSetter locale="es">
                  <Privacy />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/newsletter"
              element={
                <LocaleSetter locale="es">
                  <Newsletter />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/use-cases"
              element={
                <LocaleSetter locale="es">
                  <UseCases />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/roadmap"
              element={
                <LocaleSetter locale="es">
                  <Roadmap />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/case-studies"
              element={
                <LocaleSetter locale="es">
                  <CaseStudies />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/case-studies/:slug"
              element={
                <LocaleSetter locale="es">
                  <CaseStudies />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/vitals"
              element={
                <LocaleSetter locale="es">
                  <Vitals />
                </LocaleSetter>
              }
            />
            <Route
              path="/es/stellar"
              element={
                <Layout>
                  <LocaleSetter locale="es">
                    <Stellar />
                  </LocaleSetter>
                </Layout>
              }
            />
            <Route
              path="/es/careers"
              element={
                <Layout>
                  <LocaleSetter locale="es">
                    <Careers />
                  </LocaleSetter>
                </Layout>
              }
            />
            <Route
              path="/es/grants"
              element={
                <Layout>
                  <LocaleSetter locale="es">
                    <Grants />
                  </LocaleSetter>
                </Layout>
              }
            />
            <Route
              path="/es/about"
              element={
                <Layout>
                  <LocaleSetter locale="es">
                    <About />
                  </LocaleSetter>
                </Layout>
              }
            />
            <Route
              path="/es/contributors"
              element={
                <Layout>
                  <LocaleSetter locale="es">
                    <Contributors />
                  </LocaleSetter>
                </Layout>
              }
            />
            <Route
              path="/es/blog"
              element={
                <Layout>
                  <LocaleSetter locale="es">
                    <Blog />
                  </LocaleSetter>
                </Layout>
              }
            />
            <Route
              path="/es/blog/:slug"
              element={
                <Layout>
                  <LocaleSetter locale="es">
                    <Blog />
                  </LocaleSetter>
                </Layout>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
