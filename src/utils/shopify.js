/**
 * Small collection of Shopify-related helper functions shared across pages.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
// The backend root, without the /api suffix, used for full-page redirects
// like /install and OAuth that are not JSON API calls.
export const BACKEND_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Builds the backend install URL for a given shop domain.
 */
export function buildInstallUrl(shop) {
  const params = new URLSearchParams({ shop });
  return `${BACKEND_ROOT_URL}/api/install?${params.toString()}`;
}

/**
 * Validates that a string looks like a *.myshopify.com domain.
 */
export function isValidShopDomain(shop) {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}
