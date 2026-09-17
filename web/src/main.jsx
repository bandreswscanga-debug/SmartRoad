import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

const savedTheme = (() => {
  try {
    return localStorage.getItem('srs_theme') || 'dark';
  } catch {
    return 'dark';
  }
})();
document.documentElement.dataset.theme = savedTheme;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);