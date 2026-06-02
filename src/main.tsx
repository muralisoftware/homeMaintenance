import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize theme
const savedTheme = localStorage.getItem('hw-theme');
if (savedTheme && savedTheme !== 'default') {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
