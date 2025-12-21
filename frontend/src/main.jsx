import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Force clear service worker cache on app load (development only)
if (import.meta.env.DEV) {
  // Clear service worker caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
