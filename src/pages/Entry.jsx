import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Spinner, BlockStack, InlineStack, Banner } from '@shopify/polaris';
import api, { getShopFromUrl, startInstall } from '../services/api';

/**
 * App entry. Shopify opens the app here with a signed query (?shop&host&hmac...).
 * No shop domain is ever typed in: we ask the backend (with the session token) whether the
 * app is installed. Installed -> straight into the app UI; not installed / scopes changed ->
 * start OAuth immediately.
 */
export default function Entry() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const shop = getShopFromUrl();

    if (!shop) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;

    api
      .get('/session', { skipAuthRedirect: true })
      .then(({ data }) => {
        if (cancelled) return;
        const info = data?.data;
        if (info?.needs_reauth) {
          if (!startInstall()) setFailed(true);
          return;
        }
        const dest = info?.plan_selected ? '/dashboard' : '/pricing';
        navigate(`${dest}?shop=${encodeURIComponent(shop)}`, { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.response?.status === 401) {
          // Not installed yet -> OAuth right away.
          if (!startInstall()) setFailed(true);
        } else {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (failed) {
    return (
      <Page>
        <Banner tone="warning" title="Could not open the app">
          Please open Quote App again from your Shopify admin (Apps &gt; Quote App).
        </Banner>
      </Page>
    );
  }

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
