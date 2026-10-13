import React from 'react';
import { Navigate } from 'react-router-dom';
import { Page, Spinner, InlineStack } from '@shopify/polaris';
import { useAppEmbed } from '../context/AppEmbedContext';
import { getShopFromUrl } from '../services/api';

/**
 * Route guard: app embed on na hoy tyare sudhi aa pages (Quotes, Product Settings, Settings, Billing)
 * khulva nahi de. Direct URL / back button / bookmark thi aave to pan Dashboard par pacha moklе chhe.
 */
export default function RequireEmbed({ children }) {
  const { status, locked, checking } = useAppEmbed();
  const shop = getShopFromUrl();

  if (!shop) return <Navigate to="/login" replace />;

  // Pehli var status check thati hoy tyare thodi vaar spinner (lock/unlock nakki thay tya sudhi)
  if (checking && status !== 'on') {
    return (
      <Page>
        <InlineStack align="center">
          <Spinner size="large" />
        </InlineStack>
      </Page>
    );
  }

  if (locked) {
    return <Navigate to={`/dashboard?shop=${encodeURIComponent(shop)}`} replace />;
  }

  // 'on' ane 'unknown' (status jani na shakya) - dono ma app kholvani chhut
  return children;
}