import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Import Vercel Analytics library optimized for React/Vite environments
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* Mount telemetry component at the application root to monitor PWA traffic and Core Web Vitals */}
    <Analytics />
  </React.StrictMode>
);