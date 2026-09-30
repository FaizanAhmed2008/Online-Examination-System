import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './index.css';

const host = document.getElementById('root');

if (host === null) {
  throw new Error('index.html is missing the #root element.');
}

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
