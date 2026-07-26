import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';

const Faq = lazy(() => import('./pages/Faq'));
const Privacy = lazy(() => import('./pages/Privacy'));
const UseCases = lazy(() => import('./pages/UseCases'));
const Stellar = lazy(() => import('./pages/Stellar'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const CaseStudies = lazy(() => import('./pages/CaseStudies'));
const Ecosystem = lazy(() => import('./pages/Ecosystem'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
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
          <Route path="/ecosystem" element={<Ecosystem />} />
          <Route path="/ecosystem/:slug" element={<Ecosystem />} />
          <Route
            path="/stellar"
            element={
              <Layout>
                <Stellar />
              </Layout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
