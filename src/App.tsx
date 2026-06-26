import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Architecture from './components/Architecture';
import ForDevelopers from './components/ForDevelopers';
import Chains from './components/Chains';
import CtaStrip from './components/CtaStrip';
import Footer from './components/Footer';
import Privacy from './pages/Privacy';

function Home() {
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </BrowserRouter>
  );
}
