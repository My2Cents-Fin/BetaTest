import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'

// iOS keyboard dismiss fix: when an input loses focus, iOS Safari leaves the page
// scrolled up with empty space at the bottom. Scrolling back resets the viewport.
// Only fires when focus leaves ALL inputs (not when moving between inputs like PIN digits).
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      // If another input got focus (e.g. PIN digit → next digit), don't scroll
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      window.scrollTo(0, 0);
    }, 50);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
