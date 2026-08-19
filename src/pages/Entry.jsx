import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Spinner, BlockStack, InlineStack } from '@shopify/polaris';
import { getShopFromUrl } from '../services/api';

/**
 * Entry
 *
 * Root route ("/"). Shopify always appends a `shop` query parameter when
 * opening this app from inside the admin iframe, so we check for that
 * FIRST before ever showing the manual "enter your shop domain" form.
 *
 * - shop param present  -> go straight to the dashboard, preserving it.
 *   If the merchant isn't authenticated yet, api.js's response
 *   interceptor already redirects to /login on a 401 automatically.
 * - shop param missing   -> this is someone visiting the bare URL
 *   directly (not from Shopify admin) - only NOW show /login's manual form.
 */
export default function Entry() {
  const navigate = useNavigate();

  useEffect(() => {
    const shop = getShopFromUrl();

    if (shop) {
      navigate(`/dashboard?shop=${encodeURIComponent(shop)}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <Page>
      <BlockStack align="center">
        <InlineStack align="center">
          <Spinner size="large" />
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
