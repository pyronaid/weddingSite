import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { LanguageBoundary } from './i18n/LanguageBoundary';
import { router } from './router';
import { createSiteRepository } from './services/site';
import { SiteContentProvider } from './site/SiteContentProvider';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <SiteContentProvider repository={createSiteRepository()}>
      <LanguageBoundary>
        <RouterProvider router={router} />
      </LanguageBoundary>
    </SiteContentProvider>
  </StrictMode>,
);
