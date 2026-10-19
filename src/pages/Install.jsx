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
      setError('Valid Shopify store URL nakho, jem ke your-store.myshopify.com');
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
            Tamari Shopify store no URL nakho ane Install par click karo. Tame Shopify ni approval screen par jasho.
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
            helpText="Jem ke my-store.myshopify.com (ke fakt my-store)"
          />

          <Button variant="primary" onClick={onInstall} disabled={!value.trim()}>
            Install
          </Button>

          <Banner tone="info">
            Store URL Shopify admin ma Settings → Domains ma ke browser ni URL ma <b>admin.shopify.com/store/&lt;naam&gt;</b> tarike dekhay chhe.
          </Banner>
        </BlockStack>
      </Card>
    </Page>
  );
}
