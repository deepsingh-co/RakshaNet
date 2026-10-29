import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { LandingPage } from './landing/LandingPage';
import { useContacts } from './store/contactsStore';
import { useSettings } from './store/settingsStore';
import { useEvents } from './store/eventsStore';
import { useAuth } from './store/authStore';
import './styles/index.css';

// Auto-updating service worker: precached app shell → works fully offline.
registerSW({ immediate: true });

// Load persisted state before first paint.
useAuth.getState().load();
void useContacts.getState().load();
void useSettings.getState().load();
void useEvents.getState().load();

/**
 * Routing split:
 *   `/`      → public landing page (no hash)
 *   `/#/...` → the app itself (HashRouter inside <App />)
 */
function Root() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return hash.startsWith('#/') ? <App /> : <LandingPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
