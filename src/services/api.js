import axios from 'axios';
import { useEffect } from 'react';

/**
 * Reusable, pre-configured Axios instance for talking to the Review Pro
 * App Laravel backend. Automatically attaches the current shop query
 * parameter to every request so the backend's VerifyShop middleware can
 * identify the merchant.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Auth is the App Bridge session token (Authorization: Bearer <JWT>), not cookies, so the
// admin app works with third-party cookies / storage blocked (e.g. incognito Chrome).
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

/**
 * Reads the `shop` query parameter from the current URL. Shopify always
 * appends this to the embedded app's URL, so it is available on every
 * page load without extra configuration.
 */
export function getShopFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('shop');
  if (fromUrl) return fromUrl;
  // App Bridge exposes the shop of the embedded session; no storage needed.
  return window.shopify?.config?.shop || '';
}

/**
 * Starts (or restarts) the install / OAuth flow. Must be a TOP-level navigation
 * (the OAuth screens cannot render inside the admin iframe). Uses the signed query
 * Shopify added when it loaded the app (kept in launchQuery by main.jsx).
 */
export function startInstall() {
  const query = getLaunchQuery();
  const target = `${API_BASE_URL}/install${query}`;
  if (!query) return false;
  if (window.top !== window.self) {
    window.open(target, '_top');
  } else {
    window.location.href = target;
  }
  return true;
}

let launchQueryMemo = '';
export function rememberLaunchQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('shop') && params.get('hmac')) {
    launchQueryMemo = `?${params.toString()}`;
    try { sessionStorage.setItem('quoteapp:launch', launchQueryMemo); } catch { /* storage blocked: memory copy is enough */ }
  }
}
function getLaunchQuery() {
  if (launchQueryMemo) return launchQueryMemo;
  try { return sessionStorage.getItem('quoteapp:launch') || ''; } catch { return ''; }
}

// Custome Api Function
export function getQuotes(){
 const quotes = api.get('/quotes');
  return quotes;
}

// Get By ID 
export function getQuoteById(Id) {
  const quote = api.get(`/quotes/${Id}`);
  return quote;   
}

// Status Update 
export function updateQuoteStatus(quoteId, status) {
  if (!quoteId || !status) return null;
  return api.patch(`/quotes/${quoteId}/status`, { status });
}

// Edit Quote
export function updateQuote(id, payload) {
  if (!id) return null;
  return api.put(`/quotes/${id}`, payload);
}

export function getQuoteEmail (){
 const mail = api.get('/email-templates/')
 console.log("testing get email",mail)
 return mail;
}

export function getEmailTemplate (type, payload){
  if (!type) return null;
  return api.get(`/email-templates/${type}`);
} 
export function updateEmailTemplate (type, payload){
  if (!type) return null;
  return api.put(`/email-templates/${type}`, payload);
}

export function sendTestEmail (type, email) {
  if (!type || !email) return null;
  return api.post(`/email-templates/${type}/test`, { email });
}

// Email configuration (connected sender account)
export function getEmailConfig() {
  return api.get('/email-config');
}

export function getEmailConnectUrl() {
  return api.get('/email-config/connect');
}

export function disconnectEmailConfig() {
  return api.delete('/email-config');
}

// Attach a fresh App Bridge session token (short-lived JWT) to every request. The backend
// derives the shop from this signed token - never from a client supplied value.
api.interceptors.request.use(async (config) => {
  if (window.shopify?.idToken) {
    const token = await window.shopify.idToken();
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }

  return config;
});

// Centralized response handling: redirect to billing when the backend
// reports a 402 (subscription required), and to login when unauthenticated.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const shop = getShopFromUrl();

    if (status === 402) {
      // Install pachhi plan select nathi karyo -> pricing page (loop na thay etle pricing par hoy to redirect nahi)
      if (error.response?.data?.code === 'plan_not_selected') {
        if (window.location.pathname !== '/pricing') {
          window.location.href = `/pricing?shop=${encodeURIComponent(shop)}`;
        }
      } else {
        window.location.href = `/billing?shop=${encodeURIComponent(shop)}`;
      }
    } else if (status === 401 && !error.config?.skipAuthRedirect) {
      // Not installed / scopes changed / token rejected -> run the install flow again
      // (top level), or show the "open from Shopify admin" screen when we cannot.
      if (!startInstall() && window.location.pathname !== '/login') {
        window.location.href = `/login?shop=${encodeURIComponent(shop)}`;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
