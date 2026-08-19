import React, { useState } from 'react';
import { Page, Card, TextField, Button, FormLayout, Banner, Text, BlockStack } from '@shopify/polaris';
import { buildInstallUrl, isValidShopDomain } from '../utils/shopify';

/**
 * Login
 *
 * Entry point for merchants who are not yet inside the embedded admin
 * (e.g. installing from the App Store listing, or testing locally).
 * Collects the shop domain and redirects to the backend's /api/install
 * route, which kicks off the OAuth flow.
 */
export default function Login() {
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');

  const handleInstall = () => {
    const trimmedShop = shop.trim().toLowerCase();

    if (!isValidShopDomain(trimmedShop)) {
      setError('Enter a valid shop domain, e.g. your-store.myshopify.com');
      return;
    }

    setError('');
    window.location.href = buildInstallUrl(trimmedShop);

    localStorage.setItem('shopurl', trimmedShop);
  };

  return (
    <Page title="Install Review Pro App">
      <Card>
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            Enter your Shopify store domain to install Review Pro App and start
            collecting and displaying product reviews.
          </Text>

          {error && <Banner tone="critical">{error}</Banner>}

          <FormLayout>
            <TextField
              label="Shop domain"
              value={shop}
              onChange={setShop}
              autoComplete="off"
              placeholder="your-store.myshopify.com"
              helpText="You can find this in your Shopify admin URL."
            />
            <Button variant="primary" onClick={handleInstall}>
              Install App
            </Button>
          </FormLayout>
        </BlockStack>
      </Card>
    </Page>
  );
}
