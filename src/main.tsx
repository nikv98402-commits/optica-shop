import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router/AppRouter.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <FeatureFlagProvider><AppRouter /></FeatureFlagProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
);
