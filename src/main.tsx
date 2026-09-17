import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { RootErrorBoundary } from './components/RootErrorBoundary'

// Bitácora global: cualquier error de runtime o promesa rechazada que NO
// quede atrapada por un ErrorBoundary se registra acá, para poder ver en
// consola la causa exacta (aunque nunca deje pantalla en blanco).
window.addEventListener('error', (event) => {
  console.error('[GlobalError]', event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
