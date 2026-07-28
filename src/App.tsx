import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Layout from './components/Layout';
import TrustStrip from './components/TrustStrip';
import { ThemeProvider } from './context/ThemeContext';

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
const UseCases = lazy(() => import('./pages/UseCases'));
const Stellar = lazy(() => import('./pages/Stellar'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const CaseStudies = lazy(() => import('./pages/CaseStudies'));
const Careers = lazy(() => import('./pages/Careers'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Home() {
  return (
    <div className="bg-surface text-on-surface">
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
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/case-studies/:slug" element={<CaseStudies />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
