import { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Compare from './components/Compare';
import Architecture from './components/Architecture';
import ForDevelopers from './components/ForDevelopers';
import Chains from './components/Chains';
import CtaStrip from './components/CtaStrip';
import Footer from './components/Footer';

export default function App() {
  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;

      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      });
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);

    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return (
    <div className="bg-surface text-on-surface">
      <Header />
      <Hero />
      <Features />
      <Compare />
      <Architecture />
      <ForDevelopers />
      <Chains />
      <CtaStrip />
      <Footer />
    </div>
  );
}
