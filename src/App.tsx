import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Architecture from './components/Architecture';
import ForDevelopers from './components/ForDevelopers';
import Chains from './components/Chains';
import CtaStrip from './components/CtaStrip';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="bg-surface text-on-surface">
      <Header />
      <Hero />
      <Features />
      <Architecture />
      <ForDevelopers />
      <Chains />
      <CtaStrip />
      <Footer />
    </div>
  );
}
