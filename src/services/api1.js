import axios from 'axios';
import { useEffect } from 'react';

/**
 * Reusable, pre-configured Axios instance for talking to the Review Pro
 * App Laravel backend. Automatically attaches the current shop query
 * parameter to every request so the backend's VerifyShop middleware can
 * identify the merchant.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Reads the `shop` query parameter from the current URL. Shopify always
 * appends this to the embedded app's URL, so it is available on every
 * page load without extra configuration.
 */
export function getShopFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shop') || localStorage.getItem('shopurl') || '';
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

export function updateEmailTemplate (type, payload){
  if (!type) return null;
  return api.put(`/email-templates/${type}`, payload);
}

export function sendTestEmail (type, email) {
  if (!type || !email) return null;
  return api.post(`/email-templates/${type}/test`, { email });
}

// Attach the shop parameter to every outgoing request automatically.
api.interceptors.request.use((config) => {
  const shop = getShopFromUrl();

  if (shop) {
    config.params = { ...config.params, shop };
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
      window.location.href = `/billing?shop=${encodeURIComponent(shop)}`;
    } else if (status === 401) {
      window.location.href = `/login?shop=${encodeURIComponent(shop)}`;
    }

    return Promise.reject(error);
  }
);

export default api;
