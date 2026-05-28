import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/food-theme.css';
import './styles/smartpos-tokens.css';
import './styles/premium-ui.css';
import './pages/catalog/Catalog.css';
import './components/catalog/CatalogRegistry.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
