import { lazy, Suspense } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import TrustStrip from '../components/TrustStrip';

const Architecture = lazy(() => import('../components/Architecture'));
const ForDevelopers = lazy(() => import('../components/ForDevelopers'));
const Chains = lazy(() => import('../components/Chains'));
const StellarMetrics = lazy(() => import('../components/StellarMetrics'));
const Compare = lazy(() => import('../components/Compare'));
const Showcase = lazy(() => import('../components/Showcase'));
const IntegrationsCarousel = lazy(() => import('../components/IntegrationsCarousel'));
const CaseStudiesStrip = lazy(() => import('../components/CaseStudiesStrip'));
const EcosystemPartners = lazy(() => import('../components/EcosystemPartners'));
const CtaStrip = lazy(() => import('../components/CtaStrip'));
const Footer = lazy(() => import('../components/Footer'));

export default function Home() {
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
          <Architecture />
          <ForDevelopers />
          <Chains />
          <StellarMetrics />
          <Compare />
          <Showcase />
          <IntegrationsCarousel />
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
