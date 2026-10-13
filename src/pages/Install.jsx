import React, { useState } from 'react';
import { Page, Card, BlockStack, TextField, Button, Text, Banner } from '@shopify/polaris';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

/**
 * Store URL / naam ne `your-store.myshopify.com` ma convert kare chhe.
 * Chale evu input:
 *   my-store
 *   my-store.myshopify.com
 *   https://my-store.myshopify.com/admin
 *   https://admin.shopify.com/store/my-store/apps/...
 */
export function normalizeShop(input) {
  let v = String(input || '').trim().toLowerCase();
  if (!v) return '';

  v = v.replace(/^https?:\/\//, '');

  // admin.shopify.com/store/<handle>/...
  const adminMatch = v.match(/^admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)/);
  if (adminMatch) return `${adminMatch[1]}.myshopify.com`;

  // path / query / port kadhi nakho
  v = v.split(/[/?#]/)[0];

  if (!v.includes('.')) v = `${v}.myshopify.com`;

  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v) ? v : '';
}

/**
 * Public install page (Shopify admin ni bahar). Merchant store URL nakhe -> Install ->
 * backend `/api/install?shop=...` par redirect -> Shopify OAuth / consent screen.
 */
export default function Install() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const onInstall = () => {
    const shop = normalizeShop(value);
    if (!shop) {
      setError('Enter a valid Shopify store URL, such as your-store.myshopify.com');
      return;
    }
    setError('');
    window.location.href = `${API_BASE_URL}/install?shop=${encodeURIComponent(shop)}`;
  };

  return (
    <Page narrowWidth title="Install Quote App">
      <Card>
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            Enter your Shopify store URL and click Install. You will be redirected to Shopify’s approval screen.
          </Text>

          <TextField
            label="Store URL"
            value={value}
            onChange={(v) => {
              setValue(v);
              if (error) setError('');
            }}
            placeholder="your-store.myshopify.com"
            autoComplete="off"
            error={error || undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onInstall();
            }}
            helpText="For example, my-store.myshopify.com (or just my-store)"
          />

          <Button variant="primary" onClick={onInstall} disabled={!value.trim()}>
            Install
          </Button>

          <Banner tone="info">
            You can find your store URL in Shopify Admin → Settings → Domains or in your browser’s address bar as admin.shopify.com/store/name.
          </Banner>
        </BlockStack>
      </Card>
    </Page>
  );
}
