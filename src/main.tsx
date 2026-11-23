import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import { installVitePreloadRecovery } from './utils/lazyWithRecovery';

installVitePreloadRecovery();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
