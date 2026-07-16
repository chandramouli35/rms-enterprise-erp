import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


// Prevent negative numbers globally
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLInputElement;
  if (target && target.tagName === 'INPUT' && target.type === 'number') {
    if (e.key === '-') {
      e.preventDefault();
    }
  }
});

document.addEventListener('paste', (e) => {
  const target = e.target as HTMLInputElement;
  if (target && target.tagName === 'INPUT' && target.type === 'number') {
    const pasteData = e.clipboardData?.getData('text');
    if (pasteData && pasteData.includes('-')) {
      e.preventDefault();
    }
  }
});

// Also prevent wheel from scrolling the number inputs (often causes accidental changes)
document.addEventListener('wheel', (e) => {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLElement).blur();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
