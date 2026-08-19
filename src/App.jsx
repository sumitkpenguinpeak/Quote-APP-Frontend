import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import en from '@shopify/polaris/locales/en.json';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import QuoteList from './pages/QuoteList';
import QuoteDetail from './pages/QuoteDetail';
import ProductSetting from './pages/ProductSetting';
import Setting from './pages/Setting';

/**
 * App
 *
 * Top-level router. Every route (other than /login) expects a `shop`
 * query parameter, which is preserved by AppLayout's navigation links.
 */
export default function App() {
  return (
    <AppProvider i18n={en}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quotelist" element={<QuoteList />} />
          <Route path="/quotedetail/:id" element={<QuoteDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/product-settings" element={<ProductSetting />} />
          <Route path="/settings" element={<Setting />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
