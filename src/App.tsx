import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import Faq from './pages/Faq';
import Privacy from './pages/Privacy';
import UseCases from './pages/UseCases';
import NotFound from './pages/NotFound';

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
        <Architecture />
        <ForDevelopers />
        <Chains />
        <Compare />
        <Showcase />
        <CtaStrip />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
