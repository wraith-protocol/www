import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';

// Lazy load below-the-fold homepage components
const Architecture = lazy(() => import('./components/Architecture'));
const ForDevelopers = lazy(() => import('./components/ForDevelopers'));
const Chains = lazy(() => import('./components/Chains'));
const StellarMetrics = lazy(() => import('./components/StellarMetrics'));
const Compare = lazy(() => import('./components/Compare'));
const Showcase = lazy(() => import('./components/Showcase'));
const EcosystemPartners = lazy(() => import('./components/EcosystemPartners'));
const CtaStrip = lazy(() => import('./components/CtaStrip'));
const Footer = lazy(() => import('./components/Footer'));

// Lazy load pages
const Faq = lazy(() => import('./pages/Faq'));
const Privacy = lazy(() => import('./pages/Privacy'));
const UseCases = lazy(() => import('./pages/UseCases'));
const Stellar = lazy(() => import('./pages/Stellar'));
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
        <Features />
        <Suspense fallback={null}>
          <Architecture />
          <ForDevelopers />
          <Chains />
          <StellarMetrics />
          <Compare />
          <Showcase />
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
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/stellar" element={<Stellar />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
