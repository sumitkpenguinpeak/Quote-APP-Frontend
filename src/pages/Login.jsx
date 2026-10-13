import React from 'react';
import { Page, Card, Banner, Text, BlockStack } from '@shopify/polaris';

/**
 * Shown only when the app is opened outside the Shopify admin (no signed launch params).
 * Merchants install from the Shopify App Store / admin - the shop domain is never typed in here.
 */
export default function Login() {
  return (
    <Page title="Quote App">
      <Card>
        <BlockStack gap="400">
          <Banner tone="info">Open this app from your Shopify admin to continue.</Banner>
          <Text as="p" variant="bodyMd">
            Install or open Quote App from the Shopify App Store, or from Apps in your Shopify admin.
          </Text>
        </BlockStack>
      </Card>
    </Page>
  );
}
