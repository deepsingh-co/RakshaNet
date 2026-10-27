import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useContacts } from './store/contactsStore';
import { useSettings } from './store/settingsStore';
import { useEvents } from './store/eventsStore';
import './styles/index.css';

// Auto-updating service worker: precached app shell → works fully offline.
registerSW({ immediate: true });

// Load persisted state before first paint.
void useContacts.getState().load();
void useSettings.getState().load();
void useEvents.getState().load();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
