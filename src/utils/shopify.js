/**
 * Small collection of Shopify-related helper functions shared across pages.
 */

/**
 * Validates that a string looks like a *.myshopify.com domain.
 */
export function isValidShopDomain(shop) {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}
