import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import en from '@shopify/polaris/locales/en.json';

import Login from './pages/Login';
import Install from './pages/Install';
import Entry from './pages/Entry';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import QuoteList from './pages/QuoteList';
import QuoteDetail from './pages/QuoteDetail';
import Setting from './pages/Setting';
import AppBridgeNavMenu from './components/AppBridgeNavMenu';
import RequireEmbed from './components/RequireEmbed';
import SupportChat from './components/SupportChat';
import { AppEmbedProvider } from './context/AppEmbedContext';

// App embed on na thay tyare sudhi aa pages lock rahe chhe.
// Billing ne lock na karvu hoy to ahiya thi `guard(...)` kadhi nakho.
const guard = (page) => <RequireEmbed>{page}</RequireEmbed>;

export default function App() {
  return (
    <AppProvider i18n={en}>
      <BrowserRouter>
        <AppEmbedProvider>
          <AppBridgeNavMenu />
          <Routes>
            <Route path="/" element={<Entry />} />
            <Route path="/login" element={<Login />} />
            {/* Public install page: store URL nakho -> backend /api/install -> Shopify OAuth */}
            <Route path="/install" element={<Install />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quotelist" element={guard(<QuoteList />)} />
            <Route path="/quotedetail/:id" element={guard(<QuoteDetail />)} />
            {/* Install pachhi pehli screen: plan select karya pachhi j Dashboard (RequireEmbed lock nathi) */}
            <Route path="/pricing" element={<Billing onboarding />} />
            <Route path="/billing" element={guard(<Billing />)} />
            <Route path="/settings" element={guard(<Setting />)} />
            <Route path="*" element={<Entry />} />
          </Routes>
          <SupportChat />
        </AppEmbedProvider>
      </BrowserRouter>
    </AppProvider>
  );
}