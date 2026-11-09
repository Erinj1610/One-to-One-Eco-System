import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './api_config.js'
import App from './App.jsx'

// Automatically reload when a dynamic chunk fails due to a new Vercel deployment hash
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Reloading for fresh bundle...');
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
