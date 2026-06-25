import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Architecture from './components/Architecture';
import ForDevelopers from './components/ForDevelopers';
import Chains from './components/Chains';
import Compare from './components/Compare';
import Showcase from './components/Showcase';
import CtaStrip from './components/CtaStrip';
import Footer from './components/Footer';
import Press from './pages/Press';

const path = window.location.pathname.replace(/\/$/, '');

export default function App() {
  if (path === '/press') return <Press />;

  return (
    <div className="bg-surface text-on-surface">
      <Header />
      <Hero />
      <Features />
      <Architecture />
      <ForDevelopers />
      <Chains />
      <Compare />
      <Showcase />
      <CtaStrip />
      <Footer />
    </div>
  );
}
